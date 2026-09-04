interface EmailMessage {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

/**
 * Sends transactional email through Resend's HTTP API when RESEND_API_KEY is set.
 * Without it (local dev, or before an email provider is configured) the message is
 * written to the server log instead so the flow can still be exercised.
 */
export async function sendEmail(message: EmailMessage): Promise<{ sent: boolean }> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || "Papa's Puzzles <onboarding@resend.dev>";

    if (!apiKey) {
        console.log(
            `[email] RESEND_API_KEY not set; not sending.\nTo: ${message.to}\nSubject: ${message.subject}\n${message.text}`
        );
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
