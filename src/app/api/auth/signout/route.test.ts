import { beforeEach, describe, expect, it, vi } from 'vitest';

const query = vi.fn();
const getSession = vi.fn();
const clearSession = vi.fn();

vi.mock('@/lib/db', () => ({ query: (...args: unknown[]) => query(...args) }));
vi.mock('@/lib/session', () => ({
    getSession: () => getSession(),
    clearSession: () => clearSession(),
}));

const { POST } = await import('./route');
const signOut = () => POST(new Request('http://localhost/api/auth/signout', { method: 'POST' }), {});

describe('POST /api/auth/signout (AUTH-4)', () => {
    beforeEach(() => {
        query.mockReset().mockResolvedValue({ rows: [], rowCount: 1 });
        getSession.mockReset();
        clearSession.mockReset();
    });

    it('revokes the JWT by bumping session_version, then clears the cookie', async () => {
        getSession.mockResolvedValue({ userId: 'u1', version: 3 });
        const res = await signOut();
        expect(res.status).toBe(200);
        expect(query).toHaveBeenCalledWith(expect.stringMatching(/session_version = session_version \+ 1/), [
            'u1',
            3,
        ]);
        expect(clearSession).toHaveBeenCalledOnce();
    });

    it('just clears the cookie when there is no session', async () => {
        getSession.mockResolvedValue(null);
        await signOut();
        expect(query).not.toHaveBeenCalled();
        expect(clearSession).toHaveBeenCalledOnce();
    });
});
