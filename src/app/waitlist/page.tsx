import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { WaitlistForm } from '@/components/WaitlistForm';
import { Card } from '@/components/ui/Card';
import { SERVICE_AREA } from '@/content/site';

export const metadata: Metadata = { title: 'Join the Waitlist' };

export default function WaitlistPage() {
    return (
        <PageShell title="Join the Waitlist" width="narrow">
            <Card>
                <p className="mb-5 text-muted">{SERVICE_AREA.blockedText}</p>
                <WaitlistForm source="page" />
            </Card>
        </PageShell>
    );
}
