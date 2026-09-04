'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/PageShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Field';
import { useAuth } from '@/context/AuthContext';
import { api, errorMessage } from '@/lib/client/api';
import { MIN_PASSWORD_LENGTH } from '@/lib/constants';

function ResetForm() {
    const token = useSearchParams().get('token') ?? '';
    const { refresh, openAuthDialog } = useAuth();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setError('');
        if (password.length < MIN_PASSWORD_LENGTH)
            return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        if (password !== confirm) return setError('Passwords do not match.');
        setBusy(true);
        try {
            await api.post('/api/auth/reset-password', { token, password });
            await refresh();
            setDone(true);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <Card>
                <p className="text-lg">Your password has been updated and you are signed in.</p>
                <Button href="/" className="mt-6">
                    Back to home
                </Button>
            </Card>
        );
    }

    if (!token) {
        return (
            <Card>
                <p className="text-muted">
                    Open this page from the link in your password reset email. If the link has expired,
                    request a new one.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => openAuthDialog('forgot')}>
                    Request a new link
                </Button>
            </Card>
        );
    }

    return (
        <Card>
            <form onSubmit={submit} noValidate className="flex flex-col gap-4">
                <Input
                    label="New password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
                />
                <Input
                    label="Confirm new password"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                />
                {error && <Alert tone="error">{error}</Alert>}
                <Button type="submit" size="lg" loading={busy}>
                    Save new password
                </Button>
            </form>
        </Card>
    );
}

export default function ResetPasswordPage() {
    return (
        <PageShell title="Reset your password" width="narrow">
            <Suspense fallback={null}>
                <ResetForm />
            </Suspense>
        </PageShell>
    );
}
