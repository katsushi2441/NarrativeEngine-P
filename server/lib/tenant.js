import crypto from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Multi-tenant layer (kgm fork).
 *
 * Upstream is a single-user desktop app: one flat data dir, no auth. kgm runs
 * the same engine as a shared web service behind a PHP reverse proxy that
 * authenticates users (X login) and forwards the verified username as
 * `X-Kgm-User` plus a shared secret `X-Kgm-Token`.
 *
 * Design: every piece of campaign state in this engine — files, vector rows,
 * backups, write locks, embed jobs — is keyed by the campaign id. So instead of
 * threading a user id through every route and service, tenancy is implemented
 * as a campaign-id NAMESPACE: this middleware rewrites ids at the request
 * boundary to `u-<user>--<id>` (URL path, query string, request body, static
 * asset paths), and everything downstream partitions automatically. Routes
 * that need the tenant directly (campaign listing, settings, vault, outbound
 * fetch guards) read it from AsyncLocalStorage via `getTenant()`.
 *
 * Requests WITHOUT the headers keep upstream behaviour (single-user, no
 * prefix) but only from loopback/private networks — i.e. the box owner's own
 * LAN/dev use. Unauthenticated requests from anywhere else get 401 on the API.
 */

const als = new AsyncLocalStorage();

/** The authenticated tenant for the current request, or null in single-user (legacy) mode. */
export function getTenant() {
    return als.getStore()?.tenant ?? null;
}

const PROXY_TOKEN = (process.env.KGM_PROXY_TOKEN || '').trim();
const ADMIN_USERS = new Set(
    (process.env.KGM_ADMIN_USERS || '')
        .toLowerCase()
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
);

// Endpoints tenant-triggered server-side fetches may reach (LLM proxy, image
// generation, asset download). Everything else is refused: with client-supplied
// endpoints these fetches are otherwise an SSRF primitive on a public service.
const OUTBOUND_ALLOW = (process.env.KGM_OUTBOUND_ALLOW || 'http://192.168.0.3:11434')
    .split(',')
    .map(s => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

// X usernames: 1-15 chars of [A-Za-z0-9_]. That charset is what makes the
// prefix format below unambiguous (usernames cannot contain '-').
const USER_RE = /^[A-Za-z0-9_]{1,15}$/;
/** Matches ANY tenant prefix, mine or not. Exported for the campaign-list filter. */
export const TENANT_PREFIX_RE = /^u-[a-z0-9_]{1,15}--/;
const RAW_ID_RE = /^[a-zA-Z0-9_-]+$/;
const CAMPAIGN_URL_RE = /^(\/api\/campaigns\/)([^/?]+)(.*)$/;
const CAMPAIGN_ASSET_URL_RE = /^(\/assets\/campaigns\/)([^/?]+)(.*)$/;

function timingSafeEq(a, b) {
    const ha = crypto.createHash('sha256').update(a).digest();
    const hb = crypto.createHash('sha256').update(b).digest();
    return crypto.timingSafeEqual(ha, hb);
}

function isTrustedDirect(req) {
    // Loopback + RFC1918/link-local = the owner's own machine or LAN.
    const ip = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    if (ip === '127.0.0.1' || ip === '::1') return true;
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(ip);
}

/**
 * Map a raw id into the tenant's namespace.
 * Returns the namespaced id, or null when the id belongs to ANOTHER tenant.
 * Already-own-prefixed ids pass through unchanged (the frontend echoes back
 * ids it received from us, which are stored fully prefixed).
 */
export function namespaceId(rawId, tenant) {
    if (typeof rawId !== 'string' || !RAW_ID_RE.test(rawId)) return rawId; // let route validation 400 it
    if (rawId.startsWith(tenant.prefix)) return rawId;
    if (TENANT_PREFIX_RE.test(rawId)) return null;
    return tenant.prefix + rawId;
}

/**
 * Refuse tenant-triggered outbound fetches to non-allowlisted endpoints.
 * Single-user (legacy) mode stays unrestricted, matching upstream.
 */
export function guardOutbound(target) {
    if (!getTenant()) return;
    const t = String(target || '').replace(/\/+$/, '');
    const ok = OUTBOUND_ALLOW.some(p => t === p || t.startsWith(p + '/'));
    if (!ok) {
        const err = new Error('このサーバーでは外部エンドポイントへの接続は許可されていません');
        err.statusCode = 403;
        throw err;
    }
}

function forbid(res, what) {
    res.status(403).json({ error: `他のユーザーの${what}にはアクセスできません` });
}

/**
 * Rewrite every place a campaign id (or user-scoped filename) enters the
 * request. Throws {statusCode:403} on cross-tenant ids.
 */
function rewriteForTenant(req, tenant) {
    const deny = () => {
        const err = new Error('Cross-tenant access denied');
        err.statusCode = 403;
        throw err;
    };

    // 1) /api/campaigns/:id/** — the bulk of the API surface.
    let m = req.url.match(CAMPAIGN_URL_RE);
    if (m && m[2] !== 'import') {
        const rawId = decodeURIComponent(m[2]);
        const mapped = namespaceId(rawId, tenant);
        if (mapped === null) deny();
        req.url = m[1] + mapped + m[3];
        // Campaign meta PUT writes the body verbatim; keep body.id equal to the
        // filename id (same invariant the import route maintains).
        if (req.method === 'PUT' && (m[3] === '' || m[3].startsWith('?')) &&
            req.body && typeof req.body.id === 'string') {
            const bodyMapped = namespaceId(req.body.id, tenant);
            if (bodyMapped === null) deny();
            req.body.id = bodyMapped;
        }
    }

    // 2) Campaign bundle import — id arrives in the body.
    if (req.path === '/api/campaigns/import' && req.body?.campaign &&
        typeof req.body.campaign.id === 'string') {
        const mapped = namespaceId(req.body.campaign.id, tenant);
        if (mapped === null) deny();
        req.body.campaign.id = mapped;
    }

    // 3) Embed-job polling filter — id arrives as ?campaignId=.
    if (req.path === '/api/embedding/runtime') {
        const u = new URL(req.url, 'http://internal');
        const cid = u.searchParams.get('campaignId');
        if (cid) {
            const mapped = namespaceId(cid, tenant);
            if (mapped === null) deny();
            u.searchParams.set('campaignId', mapped);
            req.url = u.pathname + u.search;
        }
    }

    // 4) Scene-image routes — id arrives in the body.
    if (req.path.startsWith('/api/scene-images/') && req.body &&
        typeof req.body.campaignId === 'string') {
        const mapped = namespaceId(req.body.campaignId, tenant);
        if (mapped === null) deny();
        req.body.campaignId = mapped;
    }

    // 5) Portrait uploads land in one shared dir — prefix the filename so
    //    tenants cannot overwrite each other's files.
    if (req.path === '/api/assets/upload' && req.body &&
        typeof req.body.filename === 'string' && !req.body.filename.startsWith(tenant.prefix)) {
        req.body.filename = tenant.prefix + req.body.filename;
    }

    // 6) Static campaign assets (scene images) — id is the first path segment.
    m = req.url.match(CAMPAIGN_ASSET_URL_RE);
    if (m) {
        const mapped = namespaceId(decodeURIComponent(m[2]), tenant);
        if (mapped === null) deny();
        req.url = m[1] + mapped + m[3];
    }
}

export function tenantMiddleware(req, res, next) {
    const rawUser = req.get('x-kgm-user');
    const rawToken = req.get('x-kgm-token');

    if (!rawUser && !rawToken) {
        if (isTrustedDirect(req)) return next(); // owner's LAN/dev use: upstream single-user behaviour
        // Unauthenticated remote: the SPA shell and shared portraits are fine
        // to serve, but the API and campaign data are private.
        if (req.path.startsWith('/api/') || req.path.startsWith('/assets/campaigns/')) {
            return res.status(401).json({ error: 'ログインが必要です' });
        }
        return next();
    }

    if (!PROXY_TOKEN) {
        return res.status(503).json({ error: 'KGM_PROXY_TOKEN is not configured on this server' });
    }
    if (!rawToken || !timingSafeEq(rawToken, PROXY_TOKEN)) {
        return res.status(401).json({ error: 'Invalid proxy token' });
    }
    if (!rawUser || !USER_RE.test(rawUser)) {
        return res.status(400).json({ error: 'Invalid X-Kgm-User' });
    }

    const slug = rawUser.toLowerCase();
    const tenant = {
        user: rawUser,
        slug,
        prefix: `u-${slug}--`,
        isAdmin: ADMIN_USERS.has(slug),
    };

    try {
        rewriteForTenant(req, tenant);
    } catch (err) {
        if (err.statusCode === 403) return forbid(res, 'データ');
        throw err;
    }

    als.run({ tenant }, next);
}
