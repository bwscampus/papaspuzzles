import { handle, ok, readJson } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { cancelTrade, completeTrade } from '@/lib/services/trades';
import { validateEnum, validateUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>('admin/trades/[id]', async (request, { params }) => {
    await requireAdmin();
    const id = validateUuid((await params).id, 'id', 'Trade');
    const action = validateEnum(
        (await readJson(request)).action,
        ['complete', 'cancel'] as const,
        'action',
        'Action'
    );
    return ok(action === 'complete' ? await completeTrade(id) : await cancelTrade(id));
});
