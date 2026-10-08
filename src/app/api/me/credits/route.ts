import { handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getCredits } from '@/lib/services/users';

export const dynamic = 'force-dynamic';

export const GET = handle('me/credits', async () => {
    const user = await requireUser();
    return ok(await getCredits(user.email));
});
