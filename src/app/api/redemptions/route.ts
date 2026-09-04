import { handle, ok, readJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { redeemPuzzles } from '@/lib/services/redemptions';
import { validateUuidArray } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const POST = handle('redemptions', async (request) => {
    const user = await requireUser();
    const body = await readJson(request);
    const puzzleIds = validateUuidArray(body.puzzleIds, 'puzzleIds', 50, 'Puzzles');
    return ok(await redeemPuzzles(user, puzzleIds), 201);
});
