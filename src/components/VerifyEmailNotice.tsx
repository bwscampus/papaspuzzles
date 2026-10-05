'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api, errorMessage } from '@/lib/client/api';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';

/** Shown to signed-in users whose email isn't verified yet; credits and history are locked until it is. */
export function VerifyEmailNotice() {
    const { user } = useAuth();
    const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [error, setError] = useState('');

    if (!user || user.emailVerified) return null;

    const resend = async () => {
        setError('');
        setState('sending');
        try {
            await api.post('/api/auth/resend-verification', {});
            setState('sent');
        } catch (err) {
            setError(errorMessage(err));
            setState('idle');
        }
    };

    return (
        <Alert tone="warn" title="Confirm your email to see your credits and trades">
            <p>
                We sent a link to <strong>{user.email}</strong>. Your history and credits are tied to that
                address, so they unlock once you confirm it&apos;s yours.
            </p>
            {state === 'sent' ? (
                <p className="mt-2">A new link is on its way. Check your inbox and spam folder.</p>
            ) : (
                <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    loading={state === 'sending'}
                    onClick={resend}
                >
                    Resend the link
                </Button>
            )}
            {error && <p className="mt-2">{error}</p>}
        </Alert>
    );
}
