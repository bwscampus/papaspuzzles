import { handle, ok } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { BATCH_STATUSES } from '@/lib/constants';
import { adminListBatches } from '@/lib/services/donations';
import type { BatchStatus } from '@/lib/types';
import { validateEnum } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = handle('admin/donation-batches', async (request) => {
    await requireAdmin();
    const raw = new URL(request.url).searchParams.get('status');
    const status = raw ? validateEnum<BatchStatus>(raw, BATCH_STATUSES, 'status', 'Status') : undefined;
    return ok(await adminListBatches(status));
});
