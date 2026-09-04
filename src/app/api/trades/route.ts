import { handle, ok, readJson, validationError } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { MAX_NAME_LENGTH } from '@/lib/constants';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { submitTrade } from '@/lib/services/trades';
import {
    validateDate,
    validateDropoffSlot,
    validateEmail,
    validatePuzzleInputs,
    validateString,
    validateUuid,
} from '@/lib/validate';

export const dynamic = 'force-dynamic';

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

export const POST = handle('trades', async (request) => {
    rateLimit(`trades:${clientIp(request)}`, 10, 60 * 60 * 1000);
    const body = await readJson(request);
    const user = await getCurrentUser();

    const name = validateString(body.name, 'name', 'Name', MAX_NAME_LENGTH);
    const email = user ? user.email : validateEmail(body.email);
    const wantedPuzzleId = validateUuid(body.wantedPuzzleId, 'wantedPuzzleId', 'The puzzle you want');
    // The service enforces the exact count (2 for new traders, 1 for returning).
    const givenPuzzles = validatePuzzleInputs(body.givenPuzzles, 'givenPuzzles', { min: 1, max: 2 });
    const dropoffDate = validateDate(body.dropoffDate, 'dropoffDate', 'Drop-off date');
    if (dropoffDate < todayIso())
        throw validationError('Drop-off date must be today or later.', 'dropoffDate');
    const dropoffSlot = validateDropoffSlot(body.dropoffSlot);

    return ok(
        await submitTrade({ name, email, wantedPuzzleId, givenPuzzles, dropoffDate, dropoffSlot }),
        201
    );
});
