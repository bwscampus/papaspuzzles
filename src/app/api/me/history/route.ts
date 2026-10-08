import { handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getHistory } from '@/lib/services/users';

export const dynamic = 'force-dynamic';

export const GET = handle('me/history', async () => {
    const user = await requireUser();
    return ok(await getHistory(user.email));
});
