import { handle, ok } from '@/lib/api';
import { PIECES, THEMES } from '@/lib/constants';
import { listAvailable } from '@/lib/services/puzzles';
import type { Pieces, Theme } from '@/lib/types';
import { validateEnum } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = handle('puzzles', async (request) => {
    const params = new URL(request.url).searchParams;
    const theme = params.get('theme')
        ? validateEnum<Theme>(params.get('theme'), THEMES, 'theme', 'Theme')
        : undefined;
    const pieces = params.get('pieces')
        ? validateEnum<Pieces>(params.get('pieces'), PIECES, 'pieces', 'Piece count')
        : undefined;
    return ok(await listAvailable({ theme, pieces }));
});
