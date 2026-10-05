import { emailConfigProblem } from '@/lib/email';

/** Runs once when the server starts. Misconfiguration is reported loudly instead of discovered by users. */
export function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') return;
    const problem = emailConfigProblem();
    if (problem) console.error(`[startup] CONFIG ERROR: ${problem}`);
}
