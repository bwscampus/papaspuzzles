'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/PageShell';
import { PuzzlePicker } from '@/components/PuzzlePicker';
import { SignInGate } from '@/components/SignInGate';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { ApiClientError, api, errorMessage } from '@/lib/client/api';
import type { PublicPuzzle } from '@/lib/types';

function CreditsInner() {
    const pick = useSearchParams().get('pick');
    const { user, refresh, openAuthDialog } = useAuth();
    const [balance, setBalance] = useState<number | null>(null);
    const [loadError, setLoadError] = useState('');
    const [selected, setSelected] = useState<string[]>(pick ? [pick] : []);
    const [loaded, setLoaded] = useState<PublicPuzzle[] | null>(null);
    const [pickMissing, setPickMissing] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<{ creditsSpent: number; balance: number } | null>(null);

    const load = useCallback(async () => {
        try {
            const d = await api.get<{ balance: number }>('/api/me/credits');
            setBalance(d.balance);
            setLoadError('');
        } catch (err) {
            if (err instanceof ApiClientError && err.status === 401) {
                await refresh();
                openAuthDialog('signin');
            }
            setLoadError(errorMessage(err));
        }
    }, [refresh, openAuthDialog]);

    useEffect(() => {
        if (!user) return;
        void load();
        // Keep the balance current if the admin approves something while this tab is open.
        const onFocus = () => void load();
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [user, load]);

    // Drop selections that are no longer available so the picker can never lock up.
    const handleLoaded = useCallback(
        (puzzles: PublicPuzzle[]) => {
            setLoaded(puzzles);
            setSelected((current) => {
                const kept = current.filter((id) => puzzles.some((p) => p.id === id));
                if (pick && current.includes(pick) && !kept.includes(pick)) setPickMissing(true);
                return kept.length === current.length ? current : kept;
            });
        },
        [pick]
    );

    const redeem = async () => {
        if (busy || selected.length === 0) return;
        setBusy(true);
        setError('');
        try {
            const data = await api.post<{ creditsSpent: number; balance: number }>('/api/redemptions', {
                puzzleIds: selected,
            });
            setBalance(data.balance);
            setDone(data);
            setSelected([]);
            void refresh();
            window.scrollTo({ top: 0 });
        } catch (err) {
            setError(errorMessage(err));
            void load();
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <Card>
                <h2 className="text-2xl">Pick-up pending</h2>
                <p className="mt-3 text-lg">
                    You spent {done.creditsSpent} credit{done.creditsSpent === 1 ? '' : 's'}. Your puzzle
                    {done.creditsSpent === 1 ? ' is' : 's are'} reserved and we will be in touch to arrange
                    pick-up. If a pick-up is cancelled, the credit comes back.
                </p>
                <p className="mt-2 text-muted">Remaining balance: {done.balance}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <Button href="/my-trades">My Trades</Button>
                    <Button variant="outline" onClick={() => setDone(null)}>
                        Use more credits
                    </Button>
                </div>
            </Card>
        );
    }

    if (loadError) {
        return (
            <Alert tone="error" title="Could not load your credits">
                <p>{loadError}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => void load()}>
                    Try again
                </Button>
            </Alert>
        );
    }

    if (balance === null) {
        return (
            <div className="flex justify-center py-20 text-primary-text">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    const canClaim = balance >= 1;
    const selectedAllLoaded = loaded !== null && selected.every((id) => loaded.some((p) => p.id === id));

    return (
        <div className="flex flex-col gap-6">
            <Card className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-muted">Your balance</p>
                    <p className="font-display text-3xl font-bold text-primary-text">
                        {balance} credit{balance === 1 ? '' : 's'}
                    </p>
                </div>
                {canClaim ? (
                    <p className="text-sm text-muted">
                        Select up to {balance} puzzle{balance === 1 ? '' : 's'} below. Credits come off when
                        you claim and come back if a pick-up is cancelled.
                    </p>
                ) : (
                    <Button href="/donate" variant="secondary">
                        Donate to earn credits
                    </Button>
                )}
            </Card>

            {pickMissing && (
                <Alert tone="warn">That puzzle is no longer available. Pick another one below.</Alert>
            )}
            {pick && !canClaim && (
                <Alert tone="info">
                    You need at least 1 credit to claim a puzzle. Donating a puzzle earns one.
                </Alert>
            )}
            {error && <Alert tone="error">{error}</Alert>}

            {canClaim ? (
                <>
                    <PuzzlePicker
                        selected={selected}
                        onChange={setSelected}
                        mode="multi"
                        max={balance}
                        onLoaded={handleLoaded}
                    />
                    <div className="sticky bottom-4 flex items-center justify-end gap-3">
                        {selected.length > 0 && (
                            <Button variant="ghost" onClick={() => setSelected([])}>
                                Clear selection
                            </Button>
                        )}
                        <Button
                            size="lg"
                            loading={busy}
                            disabled={selected.length === 0 || !selectedAllLoaded}
                            onClick={redeem}
                        >
                            Claim {selected.length || ''} puzzle{selected.length === 1 ? '' : 's'}
                        </Button>
                    </div>
                </>
            ) : (
                <Alert tone="info">
                    Everyone starts at −1 credit. Each puzzle you donate or trade in adds a credit once the
                    admin approves it, and each puzzle you take costs one.
                </Alert>
            )}
        </div>
    );
}

export default function CreditsPage() {
    return (
        <PageShell title="Use Your Credits" subtitle="Each credit claims one available puzzle." width="wide">
            <SignInGate
                title="Sign in to use credits"
                text="Your credits are tied to your email. Sign in or create an account to see and spend them."
            >
                <Suspense fallback={null}>
                    <CreditsInner />
                </Suspense>
            </SignInGate>
        </PageShell>
    );
}
