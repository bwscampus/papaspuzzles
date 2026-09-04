import { handle, ok, readJson } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { cancelRedemption, fulfillRedemption } from '@/lib/services/redemptions';
import { validateEnum, validateUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>('admin/redemptions/[id]', async (request, { params }) => {
    await requireAdmin();
    const id = validateUuid((await params).id, 'id', 'Pickup');
    const action = validateEnum(
        (await readJson(request)).action,
        ['fulfill', 'cancel'] as const,
        'action',
        'Action'
    );
    return ok(action === 'fulfill' ? await fulfillRedemption(id) : await cancelRedemption(id));
});
