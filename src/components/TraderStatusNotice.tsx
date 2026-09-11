'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/client/api';
import { isEmail, normalizeEmail } from '@/lib/constants';
import type { TraderStatus } from '@/lib/types';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';

export type TraderLookup =
    | { state: 'idle' }
    | { state: 'loading'; email: string }
    | { state: 'ok'; email: string; status: TraderStatus }
    | { state: 'error'; email: string; message: string };

/**
 * Looks up new-vs-returning status for an email and explains the trade rule.
 * Reports every state change to the parent so it never has to guess a count.
 */
export function TraderStatusNotice({
    email,
    onChange,
}: {
    email: string;
    onChange: (lookup: TraderLookup) => void;
}) {
    const [lookup, setLookup] = useState<TraderLookup>({ state: 'idle' });
    const [attempt, setAttempt] = useState(0);

    const update = useCallback(
        (next: TraderLookup) => {
            setLookup(next);
            onChange(next);
        },
        // The parent passes a stable setter; re-subscribing on every render would restart the lookup.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    useEffect(() => {
        const normalized = normalizeEmail(email);
        if (!isEmail(normalized)) {
            update({ state: 'idle' });
            return;
        }
        // Any previous result belongs to a different email; never let it leak through.
        update({ state: 'loading', email: normalized });

        let cancelled = false;
        const timer = setTimeout(() => {
            api.get<TraderStatus>(`/api/trader-status?email=${encodeURIComponent(normalized)}`)
                .then((status) => {
                    if (!cancelled) update({ state: 'ok', email: normalized, status });
                })
                .catch((err) => {
                    if (!cancelled) update({ state: 'error', email: normalized, message: errorMessage(err) });
                });
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [email, attempt, update]);

    if (lookup.state === 'idle') return null;
    if (lookup.state === 'loading') return <p className="text-sm text-muted">Checking your trader status…</p>;
    if (lookup.state === 'error') {
        return (
            <Alert tone="error" title="We couldn't check your trader status">
                <p>{lookup.message}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setAttempt((n) => n + 1)}>
                    Try again
                </Button>
            </Alert>
        );
    }

    const { puzzlesAdded } = lookup.status;
    return lookup.status.returning ? (
        <Alert tone="success" title="Welcome back!">
            You have added {puzzlesAdded} puzzle{puzzlesAdded === 1 ? '' : 's'} to the site, so you trade one
            for one.
        </Alert>
    ) : (
        <Alert tone="info" title="First puzzle?">
            Traders who have not added a puzzle yet give two and pick one. Once one of your puzzles is
            approved, you trade one for one.
        </Alert>
    );
}
