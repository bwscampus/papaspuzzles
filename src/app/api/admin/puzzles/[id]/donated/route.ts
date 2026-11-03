import { handle, ok, readJson, validationError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { adminSetDonated } from '@/lib/services/puzzles';
import { validateUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Mark a puzzle as given to our charity partner ({ donated: true }) or put it back on Explore. */
export const POST = handle<Ctx>('admin/puzzles/[id]/donated', async (request, { params }) => {
    await requireAdmin();
    const id = validateUuid((await params).id, 'id', 'Puzzle');
    const { donated } = await readJson(request);
    if (typeof donated !== 'boolean') throw validationError('donated must be true or false.', 'donated');
    return ok(await adminSetDonated(id, donated));
});
