import { Gift, Search, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SITE, STEPS } from '@/content/site';

const STEP_ICONS = [Gift, Search, Repeat];

export default function HomePage() {
    return (
        <main>
            <section className="relative isolate overflow-hidden bg-ink">
                <video
                    className="absolute inset-0 h-full w-full object-cover"
                    src="/hero.mp4"
                    poster="/hero-poster.jpg"
                    autoPlay
                    muted
                    loop
                    playsInline
                    aria-hidden="true"
                />
                <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
                <div className="relative mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center px-4 pb-32 pt-24 text-center sm:pb-40 sm:pt-32">
                    <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-white drop-shadow-md">
                        Welcome to
                    </p>
                    <h1 className="text-6xl leading-tight text-white drop-shadow sm:text-8xl">
                        Papa&apos;s
                        <br />
                        Puzzles
                    </h1>
                    <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                        <Button href="/trade" size="lg">
                            Start a Trade
                        </Button>
                        <Button href="/donate" size="lg" variant="secondary">
                            Donate Now
                        </Button>
                    </div>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0" aria-hidden="true">
                    <svg
                        viewBox="0 0 1440 60"
                        preserveAspectRatio="none"
                        className="block h-10 w-full sm:h-16"
                    >
                        <path
                            d="M0 60L1440 60L1440 0C1440 0 1080 60 720 60C360 60 0 0 0 0L0 60Z"
                            className="fill-page"
                        />
                    </svg>
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
                    <blockquote className="font-display text-2xl font-bold leading-snug text-primary-text sm:text-3xl">
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
