import { describe, expect, it } from 'vitest';

import type { AppSettings } from '../../../types';
import { narrationLanguageRule } from '../stable';

/**
 * The narration-language directive is the whole point of the Japanese-first
 * fork: without it the model narrates in English regardless of the UI locale.
 * These tests pin the two properties that actually matter downstream —
 * that Japanese is requested, and that engine-facing tokens are declared
 * untranslatable (translating `[DICE OUTCOMES]` breaks history.ts's parser).
 */
describe('narrationLanguageRule', () => {
    const settings = (narrationLanguage?: string) =>
        ({ narrationLanguage } as unknown as AppSettings);

    it('returns nothing for English so upstream behaviour is unchanged', () => {
        expect(narrationLanguageRule(settings('en'))).toBeUndefined();
    });

    it('returns nothing when unset (fresh install / upstream campaigns)', () => {
        expect(narrationLanguageRule(settings(undefined))).toBeUndefined();
    });

    it('asks for Japanese narration when set to ja', () => {
        const rule = narrationLanguageRule(settings('ja'));
        expect(rule).toBeDefined();
        expect(rule).toContain('[NARRATION LANGUAGE]');
        expect(rule).toContain('日本語');
    });

    it('protects engine-facing tokens from being translated', () => {
        const rule = narrationLanguageRule(settings('ja')) ?? '';
        // These are contracts between the engine and the model, not prose.
        expect(rule).toContain('[DICE OUTCOMES]');
        expect(rule).toContain('[LOCATION]');
        expect(rule).toContain('[ACTIVE NPC CONTEXT]');
        expect(rule).toContain('JSON keys');
    });

    it('ignores an unknown language rather than emitting an empty directive', () => {
        expect(narrationLanguageRule(settings('xx'))).toBeUndefined();
    });
});
