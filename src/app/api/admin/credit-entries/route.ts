import { handle, ok, readJson, validationError } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { adjustCredits } from '@/lib/credits';
import { listCreditEntries } from '@/lib/services/users';
import { validateEmail } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = handle('admin/credit-entries', async () => {
    await requireAdmin();
    return ok(await listCreditEntries());
});

/** Manual credit adjustment: {email, delta, note}. */
export const POST = handle('admin/credit-entries', async (request) => {
    await requireAdmin();
    const body = await readJson(request);
    const email = validateEmail(body.email);
    const delta = Number(body.delta);
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100) {
        throw validationError('Delta must be a whole number between -100 and 100, not zero.', 'delta');
    }
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 200) : null;
    const balance = await adjustCredits(email, delta, note);
    return ok({ email, balance }, 201);
});
