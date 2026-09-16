'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/client/api';
import type { User } from '@/lib/types';

export type AuthMode = 'signin' | 'signup' | 'forgot';

interface AuthContextValue {
    user: User | null;
    loading: boolean;
    /** Credit balance for the signed-in user, null when signed out. */
    balance: number | null;
    refresh: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string, name?: string) => Promise<void>;
    signOut: () => Promise<void>;
    requestPasswordReset: (email: string) => Promise<void>;
    dialog: AuthMode | null;
    openAuthDialog: (mode?: AuthMode) => void;
    closeAuthDialog: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState<number | null>(null);
    const [dialog, setDialog] = useState<AuthMode | null>(null);

    const refresh = useCallback(async () => {
        try {
            const data = await api.get<{ user: User | null; balance: number | null }>('/api/auth/me');
            setUser(data.user);
            setBalance(data.balance);
        } catch {
            setUser(null);
            setBalance(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            loading,
            balance,
            refresh,
            signIn: async (email, password) => {
                const data = await api.post<{ user: User }>('/api/auth/signin', { email, password });
                setUser(data.user);
                void refresh();
            },
            signUp: async (email, password, name) => {
                const data = await api.post<{ user: User }>('/api/auth/signup', { email, password, name });
                setUser(data.user);
                void refresh();
            },
            signOut: async () => {
                await api.post('/api/auth/signout');
                setUser(null);
                setBalance(null);
            },
            requestPasswordReset: async (email) => {
                await api.post('/api/auth/forgot-password', { email });
            },
            dialog,
            openAuthDialog: (mode = 'signin') => setDialog(mode),
            closeAuthDialog: () => setDialog(null),
        }),
        [user, loading, balance, refresh, dialog]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
