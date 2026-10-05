import { describe, expect, it } from 'vitest';
import { ApiError, handle, isSameOriginRequest, ok, readJson, toErrorBody } from './api';

describe('ApiError', () => {
    it('maps codes to HTTP statuses', () => {
        expect(new ApiError('validation', 'x').status).toBe(400);
        expect(new ApiError('unauthorized', 'x').status).toBe(401);
        expect(new ApiError('forbidden', 'x').status).toBe(403);
        expect(new ApiError('not_found', 'x').status).toBe(404);
        expect(new ApiError('conflict', 'x').status).toBe(409);
        expect(new ApiError('unsupported_media_type', 'x').status).toBe(415);
        expect(new ApiError('rate_limited', 'x').status).toBe(429);
    });
});

describe('toErrorBody', () => {
    it('passes ApiError through with its field', () => {
        expect(toErrorBody(new ApiError('validation', 'Bad', 'email'))).toEqual({
            code: 'validation',
            message: 'Bad',
            field: 'email',
        });
    });
    it('hides Postgres details', () => {
        const body = toErrorBody({
            code: '23505',
            message: 'duplicate key value violates "users_email_lower_idx"',
        });
        expect(body.code).toBe('conflict');
        expect(body.message).not.toMatch(/users_email/);
        expect(toErrorBody({ code: '23514', message: 'check constraint' }).code).toBe('validation');
    });
    it('turns unknown errors into internal', () => {
        expect(toErrorBody(new Error('boom')).code).toBe('internal');
        expect(toErrorBody(undefined).code).toBe('internal');
    });
});

describe('handle', () => {
    const req = new Request('http://localhost/x');

    it('returns the success envelope', async () => {
        const res = await handle('test', async () => ok({ hello: 'world' }, 201))(req, {});
        expect(res.status).toBe(201);
        expect(await res.json()).toEqual({ ok: true, data: { hello: 'world' } });
    });

    it('returns the error envelope for thrown ApiError', async () => {
        const res = await handle('test', async () => {
            throw new ApiError('not_found', 'Puzzle not found');
        })(req, {});
        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({
            ok: false,
            error: { code: 'not_found', message: 'Puzzle not found' },
        });
    });
});

describe('isSameOriginRequest (CSRF, API-6)', () => {
    const post = (headers: Record<string, string>, url = 'http://localhost:3000/api/trades') =>
        new Request(url, { method: 'POST', headers });

    it('allows safe methods regardless of Origin', () => {
        const get = new Request('http://localhost:3000/api/puzzles', {
            headers: { origin: 'https://evil.example' },
        });
        expect(isSameOriginRequest(get)).toBe(true);
    });
    it('allows requests without an Origin header (curl, server-to-server)', () => {
        expect(isSameOriginRequest(post({}))).toBe(true);
    });
    it('allows the request host, the forwarded host, and APP_URL', () => {
        expect(isSameOriginRequest(post({ origin: 'http://localhost:3000' }))).toBe(true);
        expect(
            isSameOriginRequest(
                post({ origin: 'https://www.papaspuzzles.org', 'x-forwarded-host': 'www.papaspuzzles.org' })
            )
        ).toBe(true);
        expect(
            isSameOriginRequest(post({ origin: 'https://papaspuzzles.org' }), 'https://papaspuzzles.org')
        ).toBe(true);
    });
    it('rejects other sites and the opaque "null" origin', () => {
        expect(
            isSameOriginRequest(post({ origin: 'https://evil.example' }), 'https://papaspuzzles.org')
        ).toBe(false);
        expect(isSameOriginRequest(post({ origin: 'null' }))).toBe(false);
    });
    it('makes handle() answer cross-site writes with 403', async () => {
        const res = await handle('test', async () => ok({}))(post({ origin: 'https://evil.example' }), {});
        expect(res.status).toBe(403);
    });
});

describe('readJson (API-6)', () => {
    const body = (text: string, type?: string) =>
        new Request('http://localhost/x', {
            method: 'POST',
            body: text,
            headers: type ? { 'content-type': type } : {},
        });

    it('parses JSON bodies', async () => {
        expect(await readJson(body('{"a":1}', 'application/json'))).toEqual({ a: 1 });
        expect(await readJson(body('{"a":1}', 'application/json; charset=utf-8'))).toEqual({ a: 1 });
    });
    it('treats empty or malformed JSON as {}', async () => {
        expect(await readJson(body(''))).toEqual({});
        expect(await readJson(body('{nope', 'application/json'))).toEqual({});
    });
    it('rejects non-JSON bodies with 415, which shuts out HTML form CSRF', async () => {
        for (const type of ['text/plain', 'application/x-www-form-urlencoded', undefined]) {
            await expect(readJson(body('{"a":1}', type))).rejects.toMatchObject({
                code: 'unsupported_media_type',
                status: 415,
            });
        }
    });
});
