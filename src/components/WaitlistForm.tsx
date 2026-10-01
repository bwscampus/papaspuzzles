'use client';

import { useState, type FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { SERVICE_AREA } from '@/content/site';
import { ApiClientError, api, errorMessage } from '@/lib/client/api';
import { isEmail, normalizeEmail, normalizeZip } from '@/lib/constants';
import type { WaitlistSource } from '@/lib/types';

export function WaitlistForm({
    source,
    initialEmail = '',
    initialZip = '',
}: {
    source: WaitlistSource;
    initialEmail?: string;
    initialZip?: string;
}) {
    const [email, setEmail] = useState(initialEmail);
    const [zip, setZip] = useState(initialZip);
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; zip?: string }>({});
    const [formError, setFormError] = useState('');
    const [busy, setBusy] = useState(false);
    const [joined, setJoined] = useState(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setFormError('');

        const normalizedZip = normalizeZip(zip);
        const next: typeof fieldErrors = {};
        if (!isEmail(email)) next.email = 'Please enter a valid email address.';
        if (normalizedZip === null) next.zip = 'Please enter a 5-digit ZIP code.';
        setFieldErrors(next);
        if (Object.keys(next).length) return;

        setBusy(true);
        try {
            await api.post('/api/waitlist', { email: normalizeEmail(email), zip: normalizedZip, source });
            setJoined(true);
        } catch (err) {
            if (err instanceof ApiClientError && (err.field === 'email' || err.field === 'zip')) {
                setFieldErrors({ [err.field]: err.message });
            } else {
                setFormError(errorMessage(err));
            }
        } finally {
            setBusy(false);
        }
    };

    if (joined) return <Alert tone="success">{SERVICE_AREA.waitlistSuccess}</Alert>;

    return (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={fieldErrors.email}
                    autoComplete="email"
                />
                <Input
                    label="ZIP code"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    error={fieldErrors.zip}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={10}
                />
            </div>
            {formError && <Alert tone="error">{formError}</Alert>}
            <div>
                <Button type="submit" loading={busy}>
                    Join the waitlist
                </Button>
            </div>
        </form>
    );
}
