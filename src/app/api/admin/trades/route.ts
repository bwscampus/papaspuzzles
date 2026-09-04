import { handle, ok } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { TRADE_STATUSES } from '@/lib/constants';
import { adminListTrades } from '@/lib/services/trades';
import type { TradeStatus } from '@/lib/types';
import { validateEnum } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = handle('admin/trades', async (request) => {
    await requireAdmin();
    const raw = new URL(request.url).searchParams.get('status');
    const status = raw ? validateEnum<TradeStatus>(raw, TRADE_STATUSES, 'status', 'Status') : undefined;
    return ok(await adminListTrades(status));
});
