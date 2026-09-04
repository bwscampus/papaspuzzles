import { handle, ok, readJson } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { CONDITIONS, MAX_NAME_LENGTH, PIECES, PUZZLE_STATUSES, THEMES } from '@/lib/constants';
import { adminDelete, adminUpdate } from '@/lib/services/puzzles';
import type { Condition, Pieces, PuzzleInput, PuzzleStatus, Theme } from '@/lib/types';
import { validateEnum, validateImageUrl, validateString, validateUuid } from '@/lib/validate';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle<Ctx>('admin/puzzles/[id]', async (request, { params }) => {
    await requireAdmin();
    const id = validateUuid((await params).id, 'id', 'Puzzle');
    const body = await readJson(request);

    const patch: Partial<PuzzleInput> & { status?: PuzzleStatus } = {};
    if (body.name !== undefined)
        patch.name = validateString(body.name, 'name', 'Puzzle name', MAX_NAME_LENGTH);
    if (body.pieces !== undefined)
        patch.pieces = validateEnum<Pieces>(body.pieces, PIECES, 'pieces', 'Piece count');
    if (body.theme !== undefined) patch.theme = validateEnum<Theme>(body.theme, THEMES, 'theme', 'Theme');
    if (body.condition !== undefined) {
        patch.condition = validateEnum<Condition>(body.condition, CONDITIONS, 'condition', 'Condition');
    }
    if (body.imageUrl !== undefined) patch.imageUrl = validateImageUrl(body.imageUrl, 'imageUrl');
    if (body.status !== undefined) {
        patch.status = validateEnum<PuzzleStatus>(body.status, PUZZLE_STATUSES, 'status', 'Status');
    }

    return ok(await adminUpdate(id, patch));
});

export const DELETE = handle<Ctx>('admin/puzzles/[id]', async (_request, { params }) => {
    await requireAdmin();
    const id = validateUuid((await params).id, 'id', 'Puzzle');
    await adminDelete(id);
    return ok({});
});
