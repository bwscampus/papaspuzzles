'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/client/api';
import type { TraderStatus } from '@/lib/types';
import { Alert } from './ui/Alert';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Looks up new-vs-returning status for an email and explains the trade rule. */
export function TraderStatusNotice({
    email,
    onStatus,
}: {
    email: string;
    onStatus: (status: TraderStatus | null) => void;
}) {
    const [status, setStatus] = useState<TraderStatus | null>(null);

    useEffect(() => {
        if (!EMAIL_RE.test(email)) {
            setStatus(null);
            onStatus(null);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(() => {
            api.get<TraderStatus>(`/api/trader-status?email=${encodeURIComponent(email)}`)
                .then((s) => {
                    if (cancelled) return;
                    setStatus(s);
                    onStatus(s);
                })
                .catch(() => {
                    if (cancelled) return;
                    setStatus(null);
                    onStatus(null);
                });
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [email]);

    if (!status) return null;

    return status.returning ? (
        <Alert tone="success" title="Welcome back!">
            Returning traders trade one puzzle for one.
        </Alert>
    ) : (
        <Alert tone="info" title="First trade?">
            New traders give two puzzles and pick one. After your first trade you will trade one for one.
        </Alert>
    );
}
