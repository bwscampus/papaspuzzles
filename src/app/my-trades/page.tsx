'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { SignInGate } from '@/components/SignInGate';
import { StatusBadge } from '@/components/StatusBadge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { api, errorMessage } from '@/lib/client/api';
import { dropoffSlotLabel, pieceLabel } from '@/lib/constants';
import type { History } from '@/lib/types';

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function HistoryInner() {
    const { user } = useAuth();
    const [history, setHistory] = useState<History | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!user) return;
        api.get<History>('/api/me/history')
            .then(setHistory)
            .catch((err) => setError(errorMessage(err)));
    }, [user]);

    if (error) return <Alert tone="error">{error}</Alert>;
    if (!history) {
        return (
            <div className="flex justify-center py-20 text-primary">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    const empty = history.trades.length + history.donations.length + history.redemptions.length === 0;
    if (empty) {
        return (
            <EmptyState
                title="Nothing here yet"
                text="Trades, donations, and credit pick-ups under your email will show up here."
                action={<Button href="/explore">Explore puzzles</Button>}
            />
        );
    }

    return (
        <div className="flex flex-col gap-10">
            <section aria-labelledby="trades">
                <h2 id="trades" className="mb-4 text-2xl">
                    Trades
                </h2>
                {history.trades.length === 0 ? (
                    <p className="text-muted">No trades yet.</p>
                ) : (
                    <ul className="flex flex-col gap-4">
                        {history.trades.map((t) => (
                            <li key={t.id}>
                                <Card>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <p className="text-sm text-muted">
                                            {formatDate(t.createdAt)} · drop-off {t.dropoffDate} at{' '}
                                            {dropoffSlotLabel(t.dropoffSlot)} ·{' '}
                                            {t.tier === 'new' ? '2-for-1' : '1-for-1'}
                                        </p>
                                        <StatusBadge status={t.status} />
                                    </div>
                                    <div className="mt-4 grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                                You gave
                                            </p>
                                            <ul className="mt-1">
                                                {t.given.map((g) => (
                                                    <li key={g.id} className="font-semibold">
                                                        {g.name}{' '}
                                                        <span className="font-normal text-muted">
                                                            ({pieceLabel(g.pieces)} pcs)
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <ArrowRight
                                            className="hidden h-6 w-6 text-rose sm:block"
                                            aria-hidden="true"
                                        />
                                        <div className="flex items-center gap-3">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={t.received.imageUrl}
                                                alt=""
                                                className="h-14 w-14 rounded-lg object-cover"
                                            />
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                                    You received
                                                </p>
                                                <p className="font-semibold">
                                                    {t.received.name}{' '}
                                                    <span className="font-normal text-muted">
                                                        ({pieceLabel(t.received.pieces)} pcs)
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section aria-labelledby="donations">
                <h2 id="donations" className="mb-4 text-2xl">
                    Donations
                </h2>
                {history.donations.length === 0 ? (
                    <p className="text-muted">No donations yet.</p>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {history.donations.map((d) => (
                            <li key={d.id}>
                                <Card className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">
                                            {d.puzzleCount} puzzle{d.puzzleCount === 1 ? '' : 's'}
                                        </p>
                                        <p className="text-sm text-muted">
                                            {formatDate(d.createdAt)}
                                            {d.creditsAwarded !== null &&
                                                ` · ${d.creditsAwarded} credit${d.creditsAwarded === 1 ? '' : 's'} earned`}
                                        </p>
                                    </div>
                                    <StatusBadge status={d.status} />
                                </Card>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section aria-labelledby="pickups">
                <h2 id="pickups" className="mb-4 text-2xl">
                    Credit pick-ups
                </h2>
                {history.redemptions.length === 0 ? (
                    <p className="text-muted">No credit pick-ups yet.</p>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {history.redemptions.map((r) => (
                            <li key={r.id}>
                                <Card className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">
                                            {r.puzzles.map((p) => p.name).join(', ')}
                                        </p>
                                        <p className="text-sm text-muted">
                                            {formatDate(r.createdAt)} · {r.creditsSpent} credit
                                            {r.creditsSpent === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                    <StatusBadge status={r.status} />
                                </Card>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

export default function MyTradesPage() {
    return (
        <PageShell title="My Trades" subtitle="Everything you have given, received, and earned.">
            <SignInGate
                title="Sign in to see your trades"
                text="Your history is tied to your email. Sign in or create an account with the email you used."
            >
                <HistoryInner />
            </SignInGate>
        </PageShell>
    );
}
