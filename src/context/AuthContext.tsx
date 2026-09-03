"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

/** Normalized user shape used throughout the app. */
export interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => {},
    signUp: async () => {},
    signOut: async () => {},
    resetPassword: async () => {},
});

async function postJson<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
    }
    return data as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/auth/me", { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) setUser(data.user ?? null);
            })
            .catch(() => {
                if (!cancelled) setUser(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        const { user } = await postJson<{ user: AppUser }>("/api/auth/signin", { email, password });
        setUser(user);
    };

    const signUp = async (email: string, password: string) => {
        const { user } = await postJson<{ user: AppUser }>("/api/auth/signup", { email, password });
        setUser(user);
    };

    const signOut = async () => {
        await postJson("/api/auth/signout", {});
        setUser(null);
    };

    const resetPassword = async (email: string) => {
        await postJson("/api/auth/forgot-password", { email });
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
