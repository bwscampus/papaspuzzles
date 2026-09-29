import { handle, ok, readJson } from '@/lib/api';
import { WAITLIST_SOURCES } from '@/lib/constants';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { joinWaitlist } from '@/lib/services/waitlist';
import type { WaitlistSource } from '@/lib/types';
import { validateEmail, validateEnum, validateZip } from '@/lib/validate';

export const dynamic = 'force-dynamic';

export const POST = handle('waitlist', async (request) => {
    rateLimit(`waitlist:${clientIp(request)}`, 10, 60 * 60 * 1000);
    const body = await readJson(request);

    const email = validateEmail(body.email);
    const zip = validateZip(body.zip);
    const source =
        body.source === undefined
            ? 'page'
            : validateEnum<WaitlistSource>(body.source, WAITLIST_SOURCES, 'source', 'Source');

    await joinWaitlist({ email, zip, source });
    // Same answer for a first and a repeat signup, so the response never reveals who is on the list.
    return ok({ joined: true }, 201);
});
