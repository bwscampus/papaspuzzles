'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/PageShell';
import { PuzzleFormList } from '@/components/PuzzleFormList';
import { PuzzlePicker } from '@/components/PuzzlePicker';
import { TraderStatusNotice, type TraderLookup } from '@/components/TraderStatusNotice';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Field';
import { Stepper } from '@/components/ui/Stepper';
import { useAuth } from '@/context/AuthContext';
import { ApiClientError, api, errorMessage } from '@/lib/client/api';
import {
    applyServerFieldError,
    draftToInput,
    emptyDraft,
    isDraftEmpty,
    validateDraft,
    type DraftErrors,
    type PuzzleDraft,
} from '@/lib/client/puzzleDraft';
import { DROPOFF_SLOTS, dropoffSlotLabel, isEmail, normalizeEmail } from '@/lib/constants';
import type { PublicPuzzle, TraderStatus } from '@/lib/types';

const STEPS = ['Your info', 'Your puzzles', 'Pick & drop-off'] as const;

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function TradeWizard() {
    const wanted = useSearchParams().get('wanted');
    const { user, loading: authLoading, openAuthDialog } = useAuth();

    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [lookup, setLookup] = useState<TraderLookup>({ state: 'idle' });
    const [drafts, setDrafts] = useState<PuzzleDraft[]>([]);
    const [draftErrors, setDraftErrors] = useState<Record<string, DraftErrors>>({});
    const [countNotice, setCountNotice] = useState('');
    const [selected, setSelected] = useState<string[]>(wanted ? [wanted] : []);
    const [available, setAvailable] = useState<PublicPuzzle[]>([]);
    const [dropoffDate, setDropoffDate] = useState('');
    const [dropoffSlot, setDropoffSlot] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<{ tradeId: string; tier: string } | null>(null);

    useEffect(() => {
        if (user) {
            setEmail(user.email);
            if (user.displayName && !name) setName(user.displayName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    // The status only counts when it belongs to the email currently in the field.
    const status: TraderStatus | null =
        lookup.state === 'ok' && lookup.email === normalizeEmail(email) ? lookup.status : null;
    const requiredGiven = status?.requiredGiven ?? null;

    // Keep exactly the number of puzzle forms the tier requires, without discarding typed data.
    useEffect(() => {
        if (requiredGiven === null) return;
        setDrafts((current) => {
            if (current.length === requiredGiven) return current;
            if (current.length < requiredGiven) {
                return [
                    ...current,
                    ...Array.from({ length: requiredGiven - current.length }, () => emptyDraft()),
                ];
            }
            const keep = current.filter((d) => !isDraftEmpty(d));
            if (keep.length <= requiredGiven) {
                return [...keep, ...Array.from({ length: requiredGiven - keep.length }, () => emptyDraft())];
            }
            setCountNotice(
                `You're a returning trader, so only ${requiredGiven} puzzle is needed. Remove the one you'd rather keep.`
            );
            return current;
        });
    }, [requiredGiven]);

    const pickedPuzzle = useMemo(() => available.find((p) => p.id === selected[0]), [available, selected]);

    const refreshStatus = useCallback(async () => {
        const normalized = normalizeEmail(email);
        try {
            const fresh = await api.get<TraderStatus>(
                `/api/trader-status?email=${encodeURIComponent(normalized)}`
            );
            setLookup({ state: 'ok', email: normalized, status: fresh });
        } catch (err) {
            setLookup({ state: 'error', email: normalized, message: errorMessage(err) });
        }
    }, [email]);

    const goToPuzzles = (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) return setError('Please enter your name.');
        if (!isEmail(email)) return setError('Please enter a valid email address.');
        if (lookup.state === 'loading') return setError('Still checking your trader status. One moment.');
        if (lookup.state === 'error')
            return setError('We could not check your trader status. Use "Try again" above.');
        if (!status) return setError('Please wait for the trader status check to finish.');
        setStep(2);
        window.scrollTo({ top: 0 });
    };

    const goToPick = (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (requiredGiven !== null && drafts.length !== requiredGiven) {
            return setError(
                `Please provide exactly ${requiredGiven} puzzle${requiredGiven === 1 ? '' : 's'}.`
            );
        }
        const next: Record<string, DraftErrors> = {};
        for (const d of drafts) {
            const errs = validateDraft(d);
            if (Object.keys(errs).length) next[d.key] = errs;
        }
        setDraftErrors(next);
        if (Object.keys(next).length) return setError('Please fix the highlighted fields.');
        setStep(3);
        window.scrollTo({ top: 0 });
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setError('');
        if (!selected[0]) return setError('Pick the puzzle you would like.');
        if (!dropoffDate) return setError('Choose a drop-off date.');
        if (!dropoffSlot) return setError('Choose a drop-off time.');
        setBusy(true);
        try {
            const data = await api.post<{ tradeId: string; tier: string }>('/api/trades', {
                name: name.trim(),
                email: normalizeEmail(email),
                wantedPuzzleId: selected[0],
                givenPuzzles: drafts.map(draftToInput),
                dropoffDate,
                dropoffSlot,
            });
            setDone(data);
            window.scrollTo({ top: 0 });
        } catch (err) {
            if (err instanceof ApiClientError) {
                const mapped = applyServerFieldError(err.field, 'givenPuzzles', err.message, drafts);
                if (mapped) {
                    setDraftErrors(mapped);
                    setStep(2);
                } else if (err.field === 'givenPuzzles') {
                    // The server's tier is authoritative; reload it so the form count corrects itself.
                    await refreshStatus();
                    setStep(2);
                }
            }
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <PageShell title="Trade requested!" width="narrow">
                <Card>
                    <p className="text-lg">
                        <strong>{pickedPuzzle?.name ?? 'Your puzzle'}</strong> is reserved for you.
                    </p>
                    <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-muted">Drop-off</dt>
                            <dd className="font-semibold">
                                {dropoffDate} · {dropoffSlotLabel(dropoffSlot)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted">You&apos;re giving</dt>
                            <dd className="font-semibold">{drafts.map((d) => d.name).join(', ')}</dd>
                        </div>
                    </dl>
                    <p className="mt-4 text-muted">
                        Bring your puzzle{drafts.length > 1 ? 's' : ''} at the chosen time and take your new
                        one home. We will mark the trade complete after the swap.
                    </p>
                    {!user && (
                        <Alert tone="info" className="mt-6" title="Track your trades">
                            Create an account with <strong>{normalizeEmail(email)}</strong> to see this trade
                            under My Trades.
                            <div className="mt-3">
                                <Button size="sm" onClick={() => openAuthDialog('signup')}>
                                    Create an account
                                </Button>
                            </div>
                        </Alert>
                    )}
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Button href="/explore">Back to Explore</Button>
                        {user && (
                            <Button href="/my-trades" variant="outline">
                                My Trades
                            </Button>
                        )}
                    </div>
                </Card>
            </PageShell>
        );
    }

    return (
        <PageShell
            title="Start a Trade"
            subtitle="Three quick steps: tell us who you are, describe the puzzles you're giving, and pick your new one."
            width={step === 3 ? 'wide' : 'narrow'}
            actions={<Stepper steps={STEPS} current={step} />}
        >
            {step === 1 && (
                <form onSubmit={goToPuzzles} noValidate className="flex flex-col gap-6">
                    <Card className="flex flex-col gap-4">
                        <Input
                            label="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={!!user || authLoading}
                            hint={
                                user
                                    ? 'Using your account email.'
                                    : 'We use your email to tell new and returning traders apart.'
                            }
                            autoComplete="email"
                        />
                        <TraderStatusNotice email={email} onChange={setLookup} />
                    </Card>
                    {error && <Alert tone="error">{error}</Alert>}
                    <div className="flex justify-end">
                        <Button type="submit" size="lg" disabled={authLoading || !status}>
                            Continue
                        </Button>
                    </div>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={goToPick} noValidate className="flex flex-col gap-6">
                    <Alert tone="info">
                        {requiredGiven === 2
                            ? 'As a new trader, tell us about the two puzzles you are giving.'
                            : 'Tell us about the puzzle you are giving.'}
                    </Alert>
                    {countNotice && (
                        <Alert tone="warn">
                            {countNotice}
                            <div className="mt-2">
                                <Button size="sm" variant="ghost" onClick={() => setCountNotice('')}>
                                    Got it
                                </Button>
                            </div>
                        </Alert>
                    )}
                    <PuzzleFormList
                        items={drafts}
                        onChange={(items) => {
                            setDrafts(items);
                            if (requiredGiven !== null && items.length === requiredGiven) setCountNotice('');
                        }}
                        errors={draftErrors}
                        fixedCount={
                            requiredGiven !== null && drafts.length === requiredGiven
                                ? requiredGiven
                                : undefined
                        }
                        min={1}
                        max={requiredGiven ?? 2}
                    />
                    {error && <Alert tone="error">{error}</Alert>}
                    <div className="flex justify-between">
                        <Button variant="ghost" onClick={() => setStep(1)}>
                            Back
                        </Button>
                        <Button type="submit" size="lg">
                            Continue
                        </Button>
                    </div>
                </form>
            )}

            {step === 3 && (
                <form onSubmit={submit} noValidate className="flex flex-col gap-8">
                    <section aria-labelledby="pick">
                        <h2 id="pick" className="mb-4 text-xl">
                            Pick your new puzzle
                        </h2>
                        <PuzzlePicker
                            selected={selected}
                            onChange={setSelected}
                            mode="single"
                            onLoaded={setAvailable}
                        />
                    </section>

                    <Card>
                        <h2 className="mb-4 text-xl">Drop-off</h2>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Input
                                label="Date"
                                type="date"
                                min={todayIso()}
                                value={dropoffDate}
                                onChange={(e) => setDropoffDate(e.target.value)}
                            />
                            <Select
                                label="Time"
                                value={dropoffSlot}
                                onChange={(e) => setDropoffSlot(e.target.value)}
                                placeholder="Choose…"
                                options={DROPOFF_SLOTS.map((s) => ({ value: s.value, label: s.label }))}
                            />
                        </div>
                    </Card>

                    {error && <Alert tone="error">{error}</Alert>}
                    <div className="flex items-center justify-between">
                        <Button variant="ghost" onClick={() => setStep(2)}>
                            Back
                        </Button>
                        <Button type="submit" size="lg" loading={busy} disabled={authLoading}>
                            {pickedPuzzle ? `Trade for ${pickedPuzzle.name}` : 'Submit trade'}
                        </Button>
                    </div>
                </form>
            )}
        </PageShell>
    );
}

export default function TradePage() {
    return (
        <Suspense fallback={null}>
            <TradeWizard />
        </Suspense>
    );
}
