import { handle, ok, readJson } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { acceptDonationBatch, rejectDonationBatch } from '@/lib/services/donations';
import { validateEnum, validateUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handle<Ctx>('admin/donation-batches/[id]', async (request, { params }) => {
    await requireAdmin();
    const id = validateUuid((await params).id, 'id', 'Donation');
    const action = validateEnum(
        (await readJson(request)).action,
        ['accept', 'reject'] as const,
        'action',
        'Action'
    );

    if (action === 'accept') return ok(await acceptDonationBatch(id));
    await rejectDonationBatch(id);
    return ok({});
});
