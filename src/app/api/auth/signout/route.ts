import { handle, ok } from '@/lib/api';
import { query } from '@/lib/db';
import { clearSession, getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const POST = handle('auth/signout', async () => {
    const session = await getSession();
    if (session) {
        // Deleting the cookie alone would leave a stolen copy of this 30-day JWT valid.
        // Bumping session_version revokes it (and the user's other sessions), like a password reset.
        await query(
            'update users set session_version = session_version + 1 where id = $1 and session_version = $2',
            [session.userId, session.version]
        );
    }
    await clearSession();
    return ok({});
});
