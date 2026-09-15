'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, type AuthMode } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/lib/client/api';
import { MIN_PASSWORD_LENGTH } from '@/lib/constants';
import { Button } from './ui/Button';
import { Input } from './ui/Field';
import { Modal } from './ui/Modal';

const TITLES: Record<AuthMode, string> = {
    signin: 'Sign in',
    signup: 'Create your account',
    forgot: 'Reset your password',
};

/** Only same-site paths are honoured as a post-sign-in destination. */
function safeNext(value: string | null): string | null {
    return value && value.startsWith('/') && !value.startsWith('//') ? value : null;
}

/** The single sign-in / sign-up / forgot-password dialog, mounted once in Providers. */
export function AuthDialog() {
    const { dialog, closeAuthDialog, openAuthDialog, signIn, signUp, requestPasswordReset, googleEnabled } =
        useAuth();
    const toast = useToast();
    const router = useRouter();
    const params = useSearchParams();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [next, setNext] = useState<string | null>(null);
    const [pendingError, setPendingError] = useState('');

    // Pages that need a session (e.g. /admin while signed out) redirect to /?signin=1&next=/path.
    useEffect(() => {
        if (params.get('signin') === '1') {
            setNext(safeNext(params.get('next')));
            setPendingError(params.get('auth_error') ?? '');
            openAuthDialog('signin');
            router.replace('/');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params]);

    useEffect(() => {
        if (dialog) {
            setError(pendingError);
            setPendingError('');
            setBusy(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dialog]);

    const mode = dialog ?? 'signin';

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setError('');
        setBusy(true);
        try {
            if (mode === 'signin') {
                await signIn(email, password);
                toast.success('Welcome back!');
            } else if (mode === 'signup') {
                await signUp(email, password, name);
                toast.success('Your account is ready.');
            } else {
                await requestPasswordReset(email);
                toast.info('If that email has an account, a reset link is on its way.');
            }
            setPassword('');
            closeAuthDialog();
            if (mode !== 'forgot' && next) {
                router.push(next);
                setNext(null);
            }
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open={dialog !== null} onClose={closeAuthDialog} title={TITLES[mode]}>
            {googleEnabled && mode !== 'forgot' && (
                <div className="mb-5 flex flex-col gap-3">
                    <a
                        href={`/api/auth/google/start?next=${encodeURIComponent(next ?? '/')}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-rose/60 bg-white px-5 py-2.5 font-display text-sm font-bold text-ink hover:bg-rose-faint"
                    >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.95l3.66-2.84z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                            />
                        </svg>
                        Continue with Google
                    </a>
                    <div className="flex items-center gap-3 text-xs text-muted">
                        <span className="h-px flex-1 bg-rose/40" />
                        or with email
                        <span className="h-px flex-1 bg-rose/40" />
                    </div>
                </div>
            )}
            <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
                {mode === 'signup' && (
                    <Input
                        label="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                    />
                )}
                <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                />
                {mode !== 'forgot' && (
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        hint={mode === 'signup' ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
                        required
                    />
                )}
                {error && (
                    <p role="alert" className="text-sm font-medium text-danger">
                        {error}
                    </p>
                )}
                <Button type="submit" loading={busy} size="lg" className="mt-1">
                    {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
                </Button>
            </form>

            <div className="mt-5 flex flex-col items-center gap-2 text-sm text-muted">
                {mode === 'signin' && (
                    <>
                        <button
                            type="button"
                            className="hover:text-primary hover:underline"
                            onClick={() => openAuthDialog('forgot')}
                        >
                            Forgot password?
                        </button>
                        <p>
                            New here?{' '}
                            <button
                                type="button"
                                className="font-semibold text-primary hover:underline"
                                onClick={() => openAuthDialog('signup')}
                            >
                                Create an account
                            </button>
                        </p>
                    </>
                )}
                {mode === 'signup' && (
                    <p>
                        Already have an account?{' '}
                        <button
                            type="button"
                            className="font-semibold text-primary hover:underline"
                            onClick={() => openAuthDialog('signin')}
                        >
                            Sign in
                        </button>
                    </p>
                )}
                {mode === 'forgot' && (
                    <button
                        type="button"
                        className="font-semibold text-primary hover:underline"
                        onClick={() => openAuthDialog('signin')}
                    >
                        Back to sign in
                    </button>
                )}
            </div>
        </Modal>
    );
}
