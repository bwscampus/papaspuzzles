import { handle, ok } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { getTraderStatus } from '@/lib/trader';
import { validateEmail } from '@/lib/validate';

export const dynamic = 'force-dynamic';

/** Public so the trade form can explain 2-for-1 vs 1-for-1 before sign-in. Reveals only a boolean. */
export const GET = handle('trader-status', async (request) => {
    rateLimit(`trader-status:${clientIp(request)}`, 60, 60 * 1000);
    const email = validateEmail(new URL(request.url).searchParams.get('email'));
    return ok(await getTraderStatus(email));
});
