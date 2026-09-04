'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { PageShell } from '@/components/PageShell';
import { PuzzleFormList } from '@/components/PuzzleFormList';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
import { ApiClientError, api, errorMessage } from '@/lib/client/api';
import {
    applyServerFieldError,
    draftToInput,
    emptyDraft,
    validateDraft,
    type DraftErrors,
    type PuzzleDraft,
} from '@/lib/client/puzzleDraft';

interface Result {
    puzzleCount: number;
    estimatedCredits: number;
    returning: boolean;
}

export default function DonatePage() {
    const { user, openAuthDialog } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [drafts, setDrafts] = useState<PuzzleDraft[]>(() => [emptyDraft()]);
    const [errors, setErrors] = useState<Record<string, DraftErrors>>({});
    const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<Result | null>(null);

    useEffect(() => {
        if (user) {
            setEmail(user.email);
            if (user.displayName && !name) setName(user.displayName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setFormError('');
        setFieldErrors({});

        const nextErrors: Record<string, DraftErrors> = {};
        for (const d of drafts) {
            const errs = validateDraft(d);
            if (Object.keys(errs).length) nextErrors[d.key] = errs;
        }
        const nextField: typeof fieldErrors = {};
        if (!name.trim()) nextField.name = 'Name is required.';
        if (!user && !email.trim()) nextField.email = 'Email is required.';
        setErrors(nextErrors);
        setFieldErrors(nextField);
        if (Object.keys(nextErrors).length || Object.keys(nextField).length) {
            setFormError('Please fix the highlighted fields.');
            return;
        }

        setBusy(true);
        try {
            const data = await api.post<Result>('/api/donations', {
                name,
                email,
                puzzles: drafts.map(draftToInput),
            });
            setResult(data);
            window.scrollTo({ top: 0 });
        } catch (err) {
            if (err instanceof ApiClientError) {
                const mapped = applyServerFieldError(err.field, 'puzzles', err.message, drafts);
                if (mapped) setErrors(mapped);
                else if (err.field === 'name' || err.field === 'email')
                    setFieldErrors({ [err.field]: err.message });
            }
            setFormError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    if (result) {
        return (
            <PageShell title="Thank you!" width="narrow">
                <Card>
                    <p className="text-lg">
                        We received {result.puzzleCount} puzzle{result.puzzleCount === 1 ? '' : 's'}. Once
                        approved, you&apos;ll have about{' '}
                        <strong>
                            {result.estimatedCredits} credit{result.estimatedCredits === 1 ? '' : 's'}
                        </strong>
                        {result.returning ? '' : ' (first donations earn one less than the puzzle count)'}.
                    </p>
                    <p className="mt-3 text-muted">
                        We review every puzzle before it goes on Explore. Credits are added to your email as
                        soon as we do.
                    </p>
                    {!user && (
                        <Alert tone="info" className="mt-6" title="Keep your credits handy">
                            Create an account with <strong>{email}</strong> to see your credits and spend
                            them.
                            <div className="mt-3">
                                <Button size="sm" onClick={() => openAuthDialog('signup')}>
                                    Create an account
                                </Button>
                            </div>
                        </Alert>
                    )}
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Button href="/explore">Explore puzzles</Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setResult(null);
                                setDrafts([emptyDraft()]);
                            }}
                        >
                            Donate more
                        </Button>
                    </div>
                </Card>
            </PageShell>
        );
    }

    return (
        <PageShell
            title="Donate Now"
            subtitle="Give your finished puzzles a second life and earn credits toward new ones."
            width="narrow"
        >
            <form onSubmit={submit} noValidate className="flex flex-col gap-8">
                <Card>
                    <h2 className="mb-4 text-xl">Your info</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                            label="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            error={fieldErrors.name}
                            autoComplete="name"
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            error={fieldErrors.email}
                            disabled={!!user}
                            hint={user ? 'Using your account email.' : 'Credits are tied to this email.'}
                            autoComplete="email"
                        />
                    </div>
                </Card>

                <div>
                    <h2 className="mb-4 text-xl">Your puzzles</h2>
                    <PuzzleFormList items={drafts} onChange={setDrafts} errors={errors} min={1} />
                </div>

                {formError && <Alert tone="error">{formError}</Alert>}

                <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted">
                        First donation: earn one credit less than the puzzle count. After that: one credit per
                        puzzle.
                    </p>
                    <Button type="submit" size="lg" loading={busy}>
                        Submit donation
                    </Button>
                </div>
            </form>
        </PageShell>
    );
}
