'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Spinner } from './ui/Spinner';

/** Renders children only for signed-in users; otherwise a sign-in prompt. */
export function SignInGate({ title, text, children }: { title: string; text: string; children: ReactNode }) {
    const { user, loading, openAuthDialog } = useAuth();

    if (loading) {
        return (
            <div className="flex justify-center py-20 text-primary">
                <Spinner className="h-8 w-8" />
            </div>
        );
    }
    if (!user) {
        return (
            <EmptyState
                title={title}
                text={text}
                action={
                    <div className="flex gap-3">
                        <Button onClick={() => openAuthDialog('signin')}>Sign in</Button>
                        <Button variant="outline" onClick={() => openAuthDialog('signup')}>
                            Create an account
                        </Button>
                    </div>
                }
            />
        );
    }
    return <>{children}</>;
}
