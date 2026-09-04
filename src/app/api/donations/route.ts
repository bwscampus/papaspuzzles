import { handle, ok, readJson } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { MAX_NAME_LENGTH } from '@/lib/constants';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { submitDonation } from '@/lib/services/donations';
import { validateEmail, validatePuzzleInputs, validateString } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const POST = handle('donations', async (request) => {
    rateLimit(`donations:${clientIp(request)}`, 10, 60 * 60 * 1000);
    const body = await readJson(request);
    const user = await getCurrentUser();

    const name = validateString(body.name, 'name', 'Name', MAX_NAME_LENGTH);
    // Signed-in donors always donate under their account email.
    const email = user ? user.email : validateEmail(body.email);
    const puzzles = validatePuzzleInputs(body.puzzles, 'puzzles', { min: 1 });

    return ok(await submitDonation({ name, email, puzzles }), 201);
});
