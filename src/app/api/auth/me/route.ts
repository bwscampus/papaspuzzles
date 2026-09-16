import { handle, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { getCreditBalance } from '@/lib/credits';

export const dynamic = 'force-dynamic';

export const GET = handle('auth/me', async () => {
    const user = await getCurrentUser();
    const balance = user ? await getCreditBalance(user.email) : null;
    return ok({ user, balance });
});
