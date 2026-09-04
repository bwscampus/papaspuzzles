import { handle, ok } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { listCreditEntries } from '@/lib/services/users';

export const dynamic = 'force-dynamic';

export const GET = handle('admin/credit-entries', async () => {
    await requireAdmin();
    return ok(await listCreditEntries());
});
