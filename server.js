import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import cors from 'cors';
import { KeyVault } from './server/vault.js';
import { DATA_DIR, CAMPAIGNS_DIR, PUBLIC_ASSETS_DIR, MODS_DIR, APP_VERSION, ensureDirs } from './server/lib/fileStore.js';
import { createVaultRouter } from './server/routes/vault.js';
import { createSettingsRouter } from './server/routes/settings.js';
import { createCampaignsRouter } from './server/routes/campaigns.js';
import { createArchiveRouter } from './server/routes/archive.js';
import { createChaptersRouter } from './server/routes/chapters.js';
import { createTimelineRouter } from './server/routes/timeline.js';
import { createFactsRouter } from './server/routes/facts.js';
import { createBackupsRouter } from './server/routes/backups.js';
import { createAssetsRouter } from './server/routes/assets.js';
import { createOverworldRouter } from './server/routes/overworld.js';
import { createTransferRouter } from './server/routes/transfer.js';
import { createDivergenceRouter } from './server/routes/divergence.js';
import { createRulesRouter } from './server/routes/rules.js';
import { createLLMProxyRouter } from './server/routes/llmProxy.js';
import { createEmbeddingRouter } from './server/routes/embedding.js';
import { createTtsRouter } from './server/routes/tts.js';
import { createSceneImagesRouter } from './server/routes/sceneImages.js';
import { createModsRouter } from './server/routes/mods.js';
import { initDb } from './server/lib/vectorStore.js';
import { warmup as warmupEmbedder } from './server/lib/embedder.js';
import { warmupTts } from './server/lib/tts.js';
import { serverError } from './server/lib/serverError.js';

const app = express();
// Port and bind address are configurable so the app can run as a long-lived
// service rather than only as a dev-machine localhost process. Defaults keep
// upstream behaviour (3001, loopback only).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.KGM_PORT || process.env.PORT || 3001);
const HOST = process.env.KGM_HOST || '127.0.0.1';

// Initialize vault
const vault = new KeyVault(DATA_DIR);
ensureDirs();

// Auto-initialize vault with machine key if it doesn't exist
if (!vault.exists()) {
    vault.create({ presets: [] }, null);
    console.log('[Vault] Auto-created with machine key');
}
// Auto-unlock machine-key vaults on startup
if (!vault.isUnlocked()) {
    try {
        vault.unlock(null);
        console.log('[Vault] Auto-unlocked with machine key');
    } catch (e) {
        // Password-protected vault — frontend will prompt for password
        console.log('[Vault] Password-protected vault, manual unlock required');
    }
}

// ─── Middleware ───
// Restrict CORS to the only two legitimate origins:
//   - 'null'       → Electron production loads the frontend via file:// (origin "null")
//   - Vite dev URL → local development via http://localhost:5173
// Any other origin (e.g. a malicious website in the user's browser) is rejected,
// preventing cross-origin reads of /api/vault/keys and other sensitive endpoints.
const ALLOWED_ORIGINS = new Set(['null', 'http://localhost:5173']);
app.use(cors({
    origin(origin, cb) {
        // Allow same-origin requests (no Origin header) and allowlisted origins.
        if (!origin || ALLOWED_ORIGINS.has(origin)) return cb(null, true);
        return cb(null, false);
    },
    credentials: false,
}));
app.use(express.json({ limit: '500mb' }));
// Serve the built SPA from this same port when dist/ exists, so a deployed
// instance needs one port and no separate web server. In dev, Vite serves the
// frontend instead and this block is simply inert.
const DIST_DIR = path.join(__dirname, 'dist');
if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
}

app.use('/assets/portraits', express.static(PUBLIC_ASSETS_DIR));
app.use('/assets/campaigns', express.static(CAMPAIGNS_DIR));

// ─── Vector Search Init ───
try {
    initDb();
} catch (err) {
    console.error('[VectorStore] Init failed:', err.message);
}
warmupEmbedder().catch(err => console.error('[Embedder] Warmup failed:', err.message));
warmupTts().catch(err => console.error('[TTS] Warmup failed:', err.message));

// ─── Routes ───
app.use(createVaultRouter(vault));
app.use(createSettingsRouter());
app.use(createCampaignsRouter());
app.use(createArchiveRouter());
app.use(createChaptersRouter());
app.use(createTimelineRouter());
app.use(createFactsRouter());
app.use(createBackupsRouter());
app.use(createAssetsRouter());
app.use(createOverworldRouter());
app.use(createTransferRouter());
app.use(createDivergenceRouter());
app.use(createRulesRouter());
app.use(createLLMProxyRouter());
app.use(createEmbeddingRouter());
app.use(createTtsRouter());
app.use(createSceneImagesRouter(vault));
app.use('/api/mods', createModsRouter({ modsDir: MODS_DIR, appVersion: APP_VERSION }));

// ─── Central Error Handler ───
app.use((err, _req, res, _next) => {
    serverError(res, err, 'Server');
});

// ─── Start ───
// SPA fallback: any non-API path returns index.html so deep links work on a
// reload. Registered last so it never shadows an API route.
if (fs.existsSync(DIST_DIR)) {
    app.get(/^(?!\/api\/).*/, (_req, res) => {
        res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
}

app.listen(PORT, HOST, () => {
    console.log(`[GM-Cockpit API] ✓ Running on http://${HOST}:${PORT}`);
    console.log(`[GM-Cockpit API]   Data dir: ${DATA_DIR}`);
});
