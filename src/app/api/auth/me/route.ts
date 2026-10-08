import { handle, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { getCreditBalance } from '@/lib/credits';

export const dynamic = 'force-dynamic';

export const GET = handle('auth/me', async () => {
    const user = await getCurrentUser();
    // The balance belongs to whoever owns the inbox, so it stays hidden until the email is verified.
    const balance = user?.emailVerified ? await getCreditBalance(user.email) : null;
    return ok({ user, balance });
});
