import { describe, expect, it } from 'vitest';
import { ApiError, handle, ok, toErrorBody } from './api';

describe('ApiError', () => {
    it('maps codes to HTTP statuses', () => {
        expect(new ApiError('validation', 'x').status).toBe(400);
        expect(new ApiError('unauthorized', 'x').status).toBe(401);
        expect(new ApiError('forbidden', 'x').status).toBe(403);
        expect(new ApiError('not_found', 'x').status).toBe(404);
        expect(new ApiError('conflict', 'x').status).toBe(409);
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
