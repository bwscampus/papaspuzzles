import { randomBytes } from 'node:crypto';
import { appOrigin } from './appUrl';
import { query, type Queryable } from './db';
import { sendEmail } from './email';
import { sha256 } from './session';

export const VERIFICATION_TTL_HOURS = 24;

/** A fresh 32-byte token and the SHA-256 hash that is the only thing stored. */
export function newVerificationToken(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString('hex');
    return { token, tokenHash: sha256(token) };
}

/** Stores a single-use verification token for the user and emails the link to their address. */
export async function sendVerificationEmail(
    request: Request,
    user: { id: string; email: string },
    client?: Queryable
): Promise<void> {
    const { token, tokenHash } = newVerificationToken();
    await query(
        `insert into email_verification_tokens (token_hash, user_id, expires_at)
         values ($1, $2, now() + ($3 || ' hours')::interval)`,
        [tokenHash, user.id, String(VERIFICATION_TTL_HOURS)],
        client
    );
    const link = `${appOrigin(request)}/verify-email?token=${token}`;
    await sendEmail({
        to: user.email,
        subject: "Confirm your Papa's Puzzles email",
        text: `Welcome to Papa's Puzzles!\n\nConfirm this is your email address so your credits and trade history unlock (link valid for ${VERIFICATION_TTL_HOURS} hours):\n${link}\n\nIf you did not create an account, you can ignore this email.`,
        html: `<p>Welcome to Papa's Puzzles!</p><p><a href="${link}">Confirm your email address</a> so your credits and trade history unlock (valid for ${VERIFICATION_TTL_HOURS} hours).</p><p>If you did not create an account, you can ignore this email.</p>`,
    });
}
