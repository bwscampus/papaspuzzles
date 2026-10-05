/** Emailed links only ever point at APP_URL; a request's Host header is never trusted for this. */
export function appOrigin(request: Request): string {
    if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
    if (process.env.NODE_ENV !== 'production') return new URL(request.url).origin;
    throw new Error('APP_URL must be set in production.');
}
