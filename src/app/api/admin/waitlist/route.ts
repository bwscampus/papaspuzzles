import { handle, ok } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { adminListWaitlist } from '@/lib/services/waitlist';

export const dynamic = 'force-dynamic';

export const GET = handle('admin/waitlist', async () => {
    await requireAdmin();
    return ok(await adminListWaitlist());
});
