import path from 'path';
import { Router } from 'express';
import { DATA_DIR, SETTINGS_FILE, readJson, writeJson } from '../lib/fileStore.js';
import { wrapAsync } from '../lib/asyncHandler.js';
import { getTenant } from '../lib/tenant.js';

/** Strip all apiKey values before writing to disk. Keys live in the browser's IndexedDB only. */
function stripApiKeys(body) {
    if (!body || typeof body !== 'object') return body;
    const stripped = JSON.parse(JSON.stringify(body)); // deep clone
    const settings = stripped.settings;
    if (settings && Array.isArray(settings.presets)) {
        for (const preset of settings.presets) {
            for (const section of ['storyAI', 'imageAI', 'summarizerAI']) {
                if (preset[section]) preset[section].apiKey = '';
            }
        }
    }
    return stripped;
}

// Settings are per-user on a shared server: locale, narration language and LLM
// preset choices are personal, and one user saving must not reconfigure
// everyone else. Legacy (owner) mode keeps the upstream global file — which is
// also what server-side readers (e.g. indexingSpeed in campaigns.js) consult.
function settingsFile() {
    const tenant = getTenant();
    return tenant ? path.join(DATA_DIR, `settings.u-${tenant.slug}.json`) : SETTINGS_FILE;
}

export function createSettingsRouter() {
    const router = Router();

    router.get('/api/settings', wrapAsync((_req, res) => {
        const settings = readJson(settingsFile(), {});
        res.json(settings);
    }));

    router.put('/api/settings', wrapAsync((req, res) => {
        const sanitized = stripApiKeys(req.body);
        writeJson(settingsFile(), sanitized);
        res.json({ ok: true });
    }));

    return router;
}
