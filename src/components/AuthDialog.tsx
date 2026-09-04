'use client';

import { useEffect, useState, type FormEvent } from 'react';
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

/** The single sign-in / sign-up / forgot-password dialog, mounted once in Providers. */
export function AuthDialog() {
    const { dialog, closeAuthDialog, openAuthDialog, signIn, signUp, requestPasswordReset } = useAuth();
    const toast = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (dialog) {
            setError('');
            setBusy(false);
        }
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
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal open={dialog !== null} onClose={closeAuthDialog} title={TITLES[mode]}>
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
