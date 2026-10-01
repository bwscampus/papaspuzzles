import { Card } from '@/components/ui/Card';
import { SERVICE_AREA } from '@/content/site';
import type { WaitlistSource } from '@/lib/types';
import { WaitlistForm } from './WaitlistForm';

/**
 * Shown when a visitor's ZIP is outside the service area. It contains a form,
 * so render it beside the page's own form, never inside it.
 */
export function ServiceAreaNotice({
    source,
    email,
    zip,
}: {
    source: Exclude<WaitlistSource, 'page'>;
    email: string;
    zip: string;
}) {
    return (
        <Card className="mt-6 border border-rose/40" role="region" aria-labelledby="service-area-title">
            <h2 id="service-area-title" className="text-xl">
                {SERVICE_AREA.blockedTitle}
            </h2>
            <p className="mb-5 mt-2 text-muted">{SERVICE_AREA.blockedText}</p>
            {/* Remount when the ZIP changes so the waitlist form picks up the corrected value. */}
            <WaitlistForm key={zip} source={source} initialEmail={email} initialZip={zip} />
        </Card>
    );
}
