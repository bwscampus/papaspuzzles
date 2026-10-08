interface EmailMessage {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

/**
 * Production refuses to "send" without a provider: silently dropping reset emails
 * looks like success to the user, and logging them would put live sign-in links in the server log.
 */
export function emailConfigProblem(): string | null {
    if (process.env.NODE_ENV === 'production' && !process.env.RESEND_API_KEY) {
        return 'RESEND_API_KEY is not set; password reset cannot work.';
    }
    return null;
}

/**
 * Sends transactional email through Resend's HTTP API when RESEND_API_KEY is set.
 * Without it, local dev logs only that a message was suppressed, never the recipient, links, or
 * body (Production Standard API-8). Set EMAIL_DEV_LOG=1 locally to print the full message so you
 * can click a link; it is ignored in production.
 */
export async function sendEmail(message: EmailMessage): Promise<{ sent: boolean }> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || "Papa's Puzzles <onboarding@resend.dev>";

    if (!apiKey) {
        const problem = emailConfigProblem();
        if (problem) throw new Error(problem);
        if (process.env.EMAIL_DEV_LOG === '1') {
            console.log(`[email] (dev) To: ${message.to}\nSubject: ${message.subject}\n${message.text}`);
        } else {
            console.log(
                `[email] RESEND_API_KEY not set; suppressed "${message.subject}". Set EMAIL_DEV_LOG=1 to print it.`
            );
        }
        return { sent: false };
    }

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html,
        }),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Email send failed (${res.status}): ${body.slice(0, 200)}`);
    }
    return { sent: true };
}
