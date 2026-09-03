const GENERIC = 'Something went wrong. Please try again.';

/** The auth API already returns friendly messages; surface them, or fall back to a generic one. */
export function getAuthErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
        if (/fetch failed|failed to fetch|networkerror/i.test(error.message)) {
            return 'Network error. Please check your connection.';
        }
        return error.message;
    }
    return GENERIC;
}
