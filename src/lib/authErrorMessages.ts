const byCode: Record<string, string> = {
    invalid_credentials: 'Incorrect email or password.',
    user_already_exists: 'An account with this email already exists.',
    email_exists: 'An account with this email already exists.',
    weak_password: 'Password must be at least 6 characters.',
    email_address_invalid: 'Please enter a valid email address.',
    validation_failed: 'Please enter a valid email address.',
    email_not_confirmed: 'Please confirm your email address before signing in.',
    over_email_send_rate_limit: 'Too many attempts. Please wait a moment and try again.',
    over_request_rate_limit: 'Too many attempts. Please wait a moment and try again.',
    signup_disabled: 'Sign-ups are currently disabled.',
    user_not_found: 'No account found with that email.',
};

const byMessage: Array<[RegExp, string]> = [
    [/invalid login credentials/i, 'Incorrect email or password.'],
    [/already registered|already exists/i, 'An account with this email already exists.'],
    [/at least \d+ characters/i, 'Password must be at least 6 characters.'],
    [/invalid (format|email)|validate email/i, 'Please enter a valid email address.'],
    [/not confirmed/i, 'Please confirm your email address before signing in.'],
    [/rate limit/i, 'Too many attempts. Please wait a moment and try again.'],
    [/fetch failed|failed to fetch|network/i, 'Network error. Please check your connection.'],
];

export function getAuthErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
        const { code, message } = error as { code?: string; message?: string };
        if (code && byCode[code]) return byCode[code];
        if (typeof message === 'string') {
            for (const [pattern, friendly] of byMessage) {
                if (pattern.test(message)) return friendly;
            }
        }
    }
    return 'Something went wrong. Please try again.';
}
