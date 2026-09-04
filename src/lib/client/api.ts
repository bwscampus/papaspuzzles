import type { ApiErrorBody, ApiErrorCode, ApiResponse } from '@/lib/types';

/** Thrown by the client wrapper; mirrors the server's error body. */
export class ApiClientError extends Error {
    readonly code: ApiErrorCode;
    readonly status: number;
    readonly field?: string;

    constructor(status: number, body: ApiErrorBody) {
        super(body.message);
        this.name = 'ApiClientError';
        this.code = body.code;
        this.status = status;
        this.field = body.field;
    }
}

const NETWORK_ERROR: ApiErrorBody = {
    code: 'internal',
    message: 'Network error. Please check your connection.',
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
        response = await fetch(path, { cache: 'no-store', credentials: 'same-origin', ...init });
    } catch {
        throw new ApiClientError(0, NETWORK_ERROR);
    }

    let body: ApiResponse<T> | null = null;
    try {
        body = (await response.json()) as ApiResponse<T>;
    } catch {
        body = null;
    }

    if (!body || typeof body !== 'object' || !('ok' in body)) {
        throw new ApiClientError(response.status, {
            code: 'internal',
            message: 'Unexpected response from the server.',
        });
    }
    if (!body.ok) throw new ApiClientError(response.status, body.error);
    return body.data;
}

function json(method: string, body?: unknown): RequestInit {
    return {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    };
}

export const api = {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) => request<T>(path, json('POST', body ?? {})),
    patch: <T>(path: string, body: unknown) => request<T>(path, json('PATCH', body)),
    del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    upload: (file: File) => {
        const form = new FormData();
        form.append('puzzlePhoto', file);
        return request<{ imageUrl: string }>('/api/upload', { method: 'POST', body: form });
    },
};

export function errorMessage(error: unknown): string {
    if (error instanceof ApiClientError) return error.message;
    if (error instanceof Error && error.message) return error.message;
    return 'Something went wrong. Please try again.';
}
