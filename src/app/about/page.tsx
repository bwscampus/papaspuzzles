import type { Metadata } from 'next';
import Image from 'next/image';
import { Mail } from 'lucide-react';
import { MISSION, SITE, STORY, VALUES } from '@/content/site';

export const metadata: Metadata = { title: 'About Us' };

export default function AboutPage() {
    return (
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
            <header className="text-center">
                <h1 className="text-4xl sm:text-5xl">About Us</h1>
                <p className="mt-3 text-lg text-muted">{SITE.phrase}</p>
            </header>

            <section className="mt-14 rounded-2xl bg-white p-8 shadow-card sm:p-10" aria-labelledby="mission">
                <h2 id="mission" className="text-2xl">
                    Mission Statement
                </h2>
                <p className="mt-4 leading-relaxed text-ink">{MISSION}</p>
            </section>

            <section className="mt-14" aria-labelledby="values">
                <h2 id="values" className="text-center text-2xl">
                    Our Values
                </h2>
                <ul className="mt-8 grid gap-6 sm:grid-cols-2">
                    {VALUES.map((v) => (
                        <li key={v.title} className="rounded-2xl border border-rose/40 bg-white p-6">
                            <h3 className="text-xl">{v.title}</h3>
                            <p className="mt-2 text-muted">{v.text}</p>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mt-14 grid items-start gap-10 md:grid-cols-5" aria-labelledby="story">
                <div className="md:col-span-3">
                    <h2 id="story" className="text-2xl">
                        Our Story
                    </h2>
                    {STORY.map((s) => (
                        <div key={s.title} className="mt-6">
                            <h3 className="text-lg">{s.title}</h3>
                            <p className="mt-2 leading-relaxed text-ink">{s.text}</p>
                        </div>
                    ))}
                </div>
                <figure className="md:col-span-2">
                    <Image
                        src={SITE.founder.photo}
                        alt={`${SITE.founder.name} with a collection of puzzles`}
                        width={800}
                        height={600}
                        className="rounded-2xl shadow-card"
                    />
                    <figcaption className="mt-4 rounded-2xl bg-white p-5 shadow-card">
                        <p className="font-display text-lg font-bold text-primary">{SITE.founder.name}</p>
                        <p className="text-sm text-muted">{SITE.founder.title}</p>
                        <a
                            href={`mailto:${SITE.contactEmail}`}
                            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                        >
                            <Mail className="h-4 w-4" aria-hidden="true" />
                            {SITE.contactEmail}
                        </a>
                    </figcaption>
                </figure>
            </section>

            <section className="mt-16 rounded-2xl bg-cream px-6 py-12 text-center">
                <blockquote className="font-display text-2xl font-bold leading-snug text-primary">
                    “{SITE.quote}”
                </blockquote>
            </section>
        </main>
    );
}
