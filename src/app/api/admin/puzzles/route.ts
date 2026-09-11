import { handle, ok, readJson } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { PUZZLE_STATUSES } from '@/lib/constants';
import { adminCreate, adminList } from '@/lib/services/puzzles';
import type { PuzzleStatus } from '@/lib/types';
import { validateEnum, validatePuzzleInput } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = handle('admin/puzzles', async (request) => {
    await requireAdmin();
    const raw = new URL(request.url).searchParams.get('status');
    const status = raw ? validateEnum<PuzzleStatus>(raw, PUZZLE_STATUSES, 'status', 'Status') : undefined;
    return ok(await adminList(status));
});

export const POST = handle('admin/puzzles', async (request) => {
    await requireAdmin();
    const input = validatePuzzleInput(await readJson(request), 'puzzle');
    return ok(await adminCreate(input), 201);
});
