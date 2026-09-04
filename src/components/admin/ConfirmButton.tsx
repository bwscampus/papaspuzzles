'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';

/** Two-click confirmation for destructive admin actions; replaces window.confirm(). */
export function ConfirmButton({
    label,
    confirmLabel = 'Confirm',
    variant = 'danger',
    onConfirm,
    busy = false,
}: {
    label: string;
    confirmLabel?: string;
    variant?: 'danger' | 'primary' | 'outline' | 'secondary';
    onConfirm: () => void | Promise<void>;
    busy?: boolean;
}) {
    const [arming, setArming] = useState(false);

    if (!arming) {
        return (
            <Button
                size="sm"
                variant={variant === 'danger' ? 'outline' : variant}
                onClick={() => setArming(true)}
                disabled={busy}
            >
                {label}
            </Button>
        );
    }
    return (
        <span className="inline-flex items-center gap-1">
            <Button
                size="sm"
                variant={variant}
                loading={busy}
                onClick={async () => {
                    await onConfirm();
                    setArming(false);
                }}
            >
                {confirmLabel}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setArming(false)} disabled={busy}>
                Cancel
            </Button>
        </span>
    );
}
