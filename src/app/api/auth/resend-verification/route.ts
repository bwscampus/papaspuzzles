import { handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { sendVerificationEmail } from '@/lib/verification';

export const dynamic = 'force-dynamic';

export const POST = handle('auth/resend-verification', async (request) => {
    const user = await requireUser();
    // Per account and per network, so one person can't use it to spam an inbox.
    rateLimit(`resend-verification:user:${user.id}`, 3, 60 * 60 * 1000);
    rateLimit(`resend-verification:ip:${clientIp(request)}`, 10, 60 * 60 * 1000);
    if (!user.emailVerified) await sendVerificationEmail(request, user);
    return ok({});
});
