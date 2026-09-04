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
import { api, errorMessage } from '@/lib/client/api';

function CreditsInner() {
    const pick = useSearchParams().get('pick');
    const { user } = useAuth();
    const [balance, setBalance] = useState<number | null>(null);
    const [selected, setSelected] = useState<string[]>(pick ? [pick] : []);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<{ creditsSpent: number; balance: number } | null>(null);

    const load = useCallback(() => {
        api.get<{ balance: number }>('/api/me/credits')
            .then((d) => setBalance(d.balance))
            .catch((err) => setError(errorMessage(err)));
    }, []);

    useEffect(() => {
        if (user) load();
    }, [user, load]);

    const redeem = async () => {
        if (busy || selected.length === 0) return;
        setBusy(true);
        setError('');
        try {
            const data = await api.post<{ creditsSpent: number; balance: number }>('/api/redemptions', {
                puzzleIds: selected,
            });
            setDone(data);
            setSelected([]);
            window.scrollTo({ top: 0 });
        } catch (err) {
            setError(errorMessage(err));
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
                    pick-up.
                </p>
                <p className="mt-2 text-muted">Remaining balance: {done.balance}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <Button href="/my-trades">My Trades</Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setDone(null);
                            load();
                        }}
                    >
                        Use more credits
                    </Button>
                </div>
            </Card>
        );
    }

    if (balance === null && !error) {
        return (
            <div className="flex justify-center py-20 text-primary">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <Card className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-sm text-muted">Your balance</p>
                    <p className="font-display text-3xl font-bold text-primary">
                        {balance ?? 0} credit{balance === 1 ? '' : 's'}
                    </p>
                </div>
                {balance ? (
                    <p className="text-sm text-muted">
                        Select up to {balance} puzzle{balance === 1 ? '' : 's'} below.
                    </p>
                ) : (
                    <Button href="/donate" variant="secondary">
                        Donate to earn credits
                    </Button>
                )}
            </Card>

            {error && <Alert tone="error">{error}</Alert>}

            {balance ? (
                <>
                    <PuzzlePicker selected={selected} onChange={setSelected} mode="multi" max={balance} />
                    <div className="sticky bottom-4 flex justify-end">
                        <Button size="lg" loading={busy} disabled={selected.length === 0} onClick={redeem}>
                            Claim {selected.length || ''} puzzle{selected.length === 1 ? '' : 's'}
                        </Button>
                    </div>
                </>
            ) : (
                <Alert tone="info">
                    Every accepted donation earns credits. Your first donation earns one credit less than the
                    number of puzzles; after that it is one credit per puzzle.
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
