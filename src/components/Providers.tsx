'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthDialog } from './AuthDialog';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ToastProvider>
            <AuthProvider>
                {children}
                <AuthDialog />
            </AuthProvider>
        </ToastProvider>
    );
}
