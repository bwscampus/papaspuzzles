'use client';

import { Suspense, type ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthDialog } from './AuthDialog';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ToastProvider>
            <AuthProvider>
                {children}
                {/* AuthDialog reads ?signin=1&next=... so it needs a Suspense boundary. */}
                <Suspense fallback={null}>
                    <AuthDialog />
                </Suspense>
            </AuthProvider>
        </ToastProvider>
    );
}
