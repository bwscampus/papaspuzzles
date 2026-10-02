import { handle, ok } from '@/lib/api';
import { PIECE_RANGES, THEMES, pieceRange } from '@/lib/constants';
import { listAvailable } from '@/lib/services/puzzles';
import type { Theme } from '@/lib/types';
import { validateEnum } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = handle('puzzles', async (request) => {
    const params = new URL(request.url).searchParams;
    const theme = params.get('theme')
        ? validateEnum<Theme>(params.get('theme'), THEMES, 'theme', 'Theme')
        : undefined;
    const rangeKey = params.get('pieces')
        ? validateEnum(
              params.get('pieces'),
              PIECE_RANGES.map((r) => r.value),
              'pieces',
              'Piece range'
          )
        : undefined;
    const range = rangeKey ? pieceRange(rangeKey) : null;
    return ok(await listAvailable({ theme, pieces: range ? { min: range.min, max: range.max } : undefined }));
});
