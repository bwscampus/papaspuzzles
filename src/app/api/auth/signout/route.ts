import { handle, ok } from '@/lib/api';
import { clearSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const POST = handle('auth/signout', async () => {
    await clearSession();
    return ok({});
});
