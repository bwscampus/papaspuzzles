import { handle, ok } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { REDEMPTION_STATUSES } from '@/lib/constants';
import { adminListRedemptions } from '@/lib/services/redemptions';
import type { RedemptionStatus } from '@/lib/types';
import { validateEnum } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = handle('admin/redemptions', async (request) => {
    await requireAdmin();
    const raw = new URL(request.url).searchParams.get('status');
    const status = raw
        ? validateEnum<RedemptionStatus>(raw, REDEMPTION_STATUSES, 'status', 'Status')
        : undefined;
    return ok(await adminListRedemptions(status));
});
