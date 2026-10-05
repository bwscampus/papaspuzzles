import { afterEach, describe, expect, it, vi } from 'vitest';
import { emailConfigProblem, sendEmail } from './email';

const env = { ...process.env };
afterEach(() => {
    process.env = { ...env };
    vi.restoreAllMocks();
});

function setEnv(values: Record<string, string | undefined>) {
    for (const [key, value] of Object.entries(values)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
}

const message = { to: 'kid@example.com', subject: 'Reset', text: 'https://app/reset?token=SECRET' };

describe('sendEmail without a provider', () => {
    it('refuses in production instead of dropping or logging the email', async () => {
        setEnv({ NODE_ENV: 'production', RESEND_API_KEY: undefined });
        expect(emailConfigProblem()).toMatch(/RESEND_API_KEY/);
        await expect(sendEmail(message)).rejects.toThrow(/RESEND_API_KEY/);
    });

    it('never logs the recipient, link, or body by default in development', async () => {
        setEnv({ NODE_ENV: 'development', RESEND_API_KEY: undefined, EMAIL_DEV_LOG: undefined });
        const log = vi.spyOn(console, 'log').mockImplementation(() => {});
        await expect(sendEmail(message)).resolves.toEqual({ sent: false });
        const logged = log.mock.calls.flat().join(' ');
        expect(logged).not.toContain('SECRET');
        expect(logged).not.toContain('kid@example.com');
    });
});
