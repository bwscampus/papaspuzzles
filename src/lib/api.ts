import { NextResponse } from 'next/server';
import type { ApiErrorBody, ApiErrorCode, ApiResponse } from './types';

const STATUS_FOR_CODE: Record<ApiErrorCode, number> = {
    validation: 400,
    unauthorized: 401,
    forbidden: 403,
    not_found: 404,
    conflict: 409,
    internal: 500,
};

/** Thrown by services and route handlers; `handle()` turns it into a response. */
export class ApiError extends Error {
    readonly code: ApiErrorCode;
    readonly status: number;
    readonly field?: string;

    constructor(code: ApiErrorCode, message: string, field?: string) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.status = STATUS_FOR_CODE[code];
        this.field = field;
    }
}

export const validationError = (message: string, field?: string) => new ApiError('validation', message, field);
export const notFound = (message = 'Not found') => new ApiError('not_found', message);
export const conflict = (message: string) => new ApiError('conflict', message);
export const unauthorized = (message = 'Please sign in.') => new ApiError('unauthorized', message);
export const forbidden = (message = 'Not allowed.') => new ApiError('forbidden', message);

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
    return NextResponse.json({ ok: true as const, data }, { status });
}

export function fail(error: ApiErrorBody): NextResponse<ApiResponse<never>> {
    return NextResponse.json({ ok: false as const, error }, { status: STATUS_FOR_CODE[error.code] });
}

interface PgLikeError {
    code?: string;
    message?: string;
}

/**
 * Maps a thrown value to an API error body. Postgres errors become generic
 * messages so table and column names never reach the client.
 */
export function toErrorBody(error: unknown): ApiErrorBody {
    if (error instanceof ApiError) {
        return { code: error.code, message: error.message, ...(error.field ? { field: error.field } : {}) };
    }
    const pg = (error ?? {}) as PgLikeError;
    switch (pg.code) {
        case '23505':
            return { code: 'conflict', message: 'That record already exists.' };
        case '23503':
        case '23502':
        case '23514':
        case '22P02':
        case '22007':
            return { code: 'validation', message: 'The request contains an invalid value.' };
        default:
            return { code: 'internal', message: 'Something went wrong. Please try again.' };
    }
}

type Handler<Ctx> = (request: Request, ctx: Ctx) => Promise<NextResponse>;

/** Wraps a route handler so every error becomes the standard envelope. */
export function handle<Ctx = unknown>(name: string, fn: Handler<Ctx>): Handler<Ctx> {
    return async (request, ctx) => {
        try {
            return await fn(request, ctx);
        } catch (error) {
            const body = toErrorBody(error);
            if (body.code === 'internal') {
                console.error(`[${name}]`, error);
            }
            return fail(body);
        }
    };
}

/** Parses a JSON body, returning {} for empty or malformed input. */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
    try {
        const body = await request.json();
        return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
    } catch {
        return {};
    }
}
