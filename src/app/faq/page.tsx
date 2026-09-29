import type { Metadata } from 'next';
import { PageShell } from '@/components/PageShell';
import { FAQ, SITE } from '@/content/site';

export const metadata: Metadata = { title: 'FAQ' };

export default function FaqPage() {
    return (
        <PageShell title="Frequently Asked Questions" width="narrow">
            <div className="flex flex-col gap-6">
                {FAQ.map((item) => (
                    <section key={item.q} className="rounded-2xl bg-white p-6 shadow-card">
                        <h2 className="text-xl">{item.q}</h2>
                        <p className="mt-2 leading-relaxed text-ink">
                            {item.a}
                            {item.showEmail && (
                                <>
                                    {' '}
                                    <a
                                        href={`mailto:${SITE.contactEmail}`}
                                        className="font-semibold text-primary-text hover:underline"
                                    >
                                        {SITE.contactEmail}
                                    </a>
                                </>
                            )}
                        </p>
                    </section>
                ))}
            </div>
        </PageShell>
    );
}
