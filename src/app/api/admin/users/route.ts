import { handle, ok } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { adminListUsers } from '@/lib/services/users';

export const dynamic = 'force-dynamic';

export const GET = handle('admin/users', async () => {
    await requireAdmin();
    return ok(await adminListUsers());
});
