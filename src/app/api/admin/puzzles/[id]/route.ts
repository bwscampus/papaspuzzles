import { handle, ok, readJson, validationError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { MAX_NAME_LENGTH, THEMES } from '@/lib/constants';
import { adminDelete, adminUpdate } from '@/lib/services/puzzles';
import type { PuzzleInput, Theme } from '@/lib/types';
import { validateEnum, validateImageUrl, validateString, validateUuid, validatePieces } from '@/lib/validate';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handle<Ctx>('admin/puzzles/[id]', async (request, { params }) => {
    await requireAdmin();
    const id = validateUuid((await params).id, 'id', 'Puzzle');
    const body = await readJson(request);

    if (body.status !== undefined) {
        throw validationError('Review puzzles from the Donations or Trades page.', 'status');
    }
    const patch: Partial<PuzzleInput> = {};
    if (body.name !== undefined)
        patch.name = validateString(body.name, 'name', 'Puzzle name', MAX_NAME_LENGTH);
    if (body.pieces !== undefined) patch.pieces = validatePieces(body.pieces, 'pieces');
    if (body.theme !== undefined) patch.theme = validateEnum<Theme>(body.theme, THEMES, 'theme', 'Theme');
    if (body.imageUrl !== undefined) patch.imageUrl = validateImageUrl(body.imageUrl, 'imageUrl');

    return ok(await adminUpdate(id, patch));
});

export const DELETE = handle<Ctx>('admin/puzzles/[id]', async (_request, { params }) => {
    await requireAdmin();
    const id = validateUuid((await params).id, 'id', 'Puzzle');
    await adminDelete(id);
    return ok({});
});
