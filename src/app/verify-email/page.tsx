'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/PageShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { api, errorMessage } from '@/lib/client/api';

function Verify() {
    const token = useSearchParams().get('token') ?? '';
    const { refresh } = useAuth();
    const [state, setState] = useState<'working' | 'done' | 'error'>(token ? 'working' : 'error');
    const [error, setError] = useState(
        token ? '' : 'Open this page from the link in your verification email.'
    );
    // Tokens are single-use; React's dev double-invoke must not spend it twice.
    const started = useRef(false);

    useEffect(() => {
        if (!token || started.current) return;
        started.current = true;
        api.post('/api/auth/verify-email', { token })
            .then(async () => {
                await refresh();
                setState('done');
            })
            .catch((err) => {
                setError(errorMessage(err));
                setState('error');
            });
    }, [token, refresh]);

    if (state === 'working') {
        return (
            <div className="flex justify-center py-20 text-primary-text">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }
    if (state === 'error') {
        return (
            <Card>
                <Alert tone="error">{error}</Alert>
                <Button href="/my-trades" variant="outline" className="mt-6">
                    Go to My Trades
                </Button>
            </Card>
        );
    }
    return (
        <Card>
            <p className="text-lg">Your email is confirmed. Your credits and trade history are unlocked.</p>
            <Button href="/my-trades" className="mt-6">
                See my trades
            </Button>
        </Card>
    );
}

export default function VerifyEmailPage() {
    return (
        <PageShell title="Confirm your email" width="narrow">
            <Suspense fallback={null}>
                <Verify />
            </Suspense>
        </PageShell>
    );
}
