import { handle, ok, readJson } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { REVIEW_ACTIONS, reviewPuzzle } from '@/lib/services/review';
import { validateEnum, validateUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** Accept, reject, or restore one donated puzzle. Its donation batch follows its puzzles. */
export const POST = handle<Ctx>('admin/puzzles/[id]/review', async (request, { params }) => {
    await requireAdmin();
    const id = validateUuid((await params).id, 'id', 'Puzzle');
    const action = validateEnum((await readJson(request)).action, REVIEW_ACTIONS, 'action', 'Action');
    return ok(await reviewPuzzle(id, action));
});
