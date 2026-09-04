import { Gift, Search, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SITE, STEPS } from '@/content/site';

const STEP_ICONS = [Gift, Search, Repeat];

export default function HomePage() {
    return (
        <main>
            <section className="relative isolate overflow-hidden bg-ink">
                <video
                    className="absolute inset-0 h-full w-full object-cover opacity-60"
                    src="/hero.mp4"
                    poster="/hero-poster.jpg"
                    autoPlay
                    muted
                    loop
                    playsInline
                    aria-hidden="true"
                />
                <div
                    className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/30 to-ink/70"
                    aria-hidden="true"
                />
                <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:py-32">
                    <h1 className="text-4xl text-white drop-shadow sm:text-6xl">{SITE.phrase}</h1>
                    <p className="mt-4 max-w-2xl text-lg text-cream">
                        Finished a puzzle? Trade it in, donate it for credits, and take home a new challenge.
                    </p>
                    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                        <Button href="/trade" size="lg">
                            Start a Trade
                        </Button>
                        <Button href="/donate" size="lg" variant="secondary">
                            Donate Now
                        </Button>
                        <Button
                            href="/credits"
                            size="lg"
                            variant="outline"
                            className="border-white text-white hover:bg-white/10"
                        >
                            Use Your Credits
                        </Button>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
                <h2 className="text-center text-3xl">How it works</h2>
                <ol className="mt-10 grid gap-6 sm:grid-cols-3">
                    {STEPS.map((step, i) => {
                        const Icon = STEP_ICONS[i];
                        return (
                            <li key={step.title} className="rounded-2xl bg-white p-8 text-center shadow-card">
                                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-ink">
                                    <Icon className="h-7 w-7" aria-hidden="true" />
                                </span>
                                <h3 className="mt-5 text-xl">
                                    <span className="text-muted">{i + 1}. </span>
                                    {step.title}
                                </h3>
                                <p className="mt-2 text-muted">{step.text}</p>
                            </li>
                        );
                    })}
                </ol>
            </section>

            <section className="bg-cream">
                <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
                    <blockquote className="font-display text-2xl font-bold leading-snug text-primary sm:text-3xl">
                        “{SITE.quote}”
                    </blockquote>
                    <p className="mt-4 text-sm text-muted">
                        {SITE.founder.name}, {SITE.founder.title}
                    </p>
                </div>
            </section>
        </main>
    );
}
