import { describe, expect, it } from 'vitest';

import { detectFormatFromEndpoint } from '../llmApiHelper';

/**
 * Two deployment realities the upstream defaults did not cover:
 *
 * 1. Ollama usually does NOT run on the same box as the UI once the model
 *    outgrows that machine. Detecting only localhost sent LAN endpoints down
 *    the OpenAI path (`/v1/chat/completions`), which Ollama does not serve.
 *
 * 2. Ollama turns `think` ON by default for thinking-capable models. Leaving
 *    the field out is not "off" — hidden reasoning consumes num_predict and
 *    the reply returns empty. That behaviour is asserted where the request
 *    body is built; here we pin the detection half.
 */
describe('detectFormatFromEndpoint — Ollama on any host', () => {
    it('detects a LAN Ollama by its port', () => {
        expect(detectFormatFromEndpoint('http://192.168.0.3:11434')).toBe('ollama');
    });

    it('still detects the loopback forms', () => {
        expect(detectFormatFromEndpoint('http://localhost:11434')).toBe('ollama');
        expect(detectFormatFromEndpoint('http://127.0.0.1:11434')).toBe('ollama');
    });

    it('detects a hostname-based Ollama', () => {
        expect(detectFormatFromEndpoint('http://ollama.local:11434/')).toBe('ollama');
    });

    it('does not claim other ports on the same host', () => {
        // 11434 is the signal; a different port is some other service.
        expect(detectFormatFromEndpoint('http://192.168.0.3:8080')).toBeNull();
    });

    it('leaves hosted providers alone', () => {
        expect(detectFormatFromEndpoint('https://api.anthropic.com')).toBe('claude');
        expect(detectFormatFromEndpoint('https://api.deepseek.com')).toBeNull();
    });
});
