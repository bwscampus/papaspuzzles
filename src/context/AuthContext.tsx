"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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

function toAppUser(user: SupabaseUser | null | undefined): AppUser | null {
    if (!user) return null;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const displayName =
        (typeof meta.full_name === "string" && meta.full_name) ||
        (typeof meta.name === "string" && meta.name) ||
        null;
    const photoURL = typeof meta.avatar_url === "string" ? meta.avatar_url : null;
    return { uid: user.id, email: user.email ?? null, displayName, photoURL };
}

function requireAuth() {
    if (!supabase) {
        throw new Error("Authentication is not configured.");
    }
    return supabase.auth;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            const appUser = toAppUser(session?.user);
            setUser(appUser);
            setLoading(false);

            if (appUser && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
                try {
                    await fetch("/api/users", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            uid: appUser.uid,
                            email: appUser.email,
                            displayName: appUser.displayName,
                        }),
                    });
                } catch (err) {
                    console.error("Failed to sync user:", err);
                }
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await requireAuth().signInWithPassword({ email, password });
        if (error) throw error;
    };

    const signUp = async (email: string, password: string) => {
        const { data, error } = await requireAuth().signUp({ email, password });
        if (error) throw error;
        // Supabase returns a user with no identities when the email is already registered.
        if (data.user && data.user.identities?.length === 0) {
            throw Object.assign(new Error("User already registered"), { code: "user_already_exists" });
        }
        if (data.user && !data.session) {
            throw new Error("Check your email to confirm your account, then sign in.");
        }
    };

    const signOut = async () => {
        const { error } = await requireAuth().signOut();
        if (error) throw error;
    };

    const resetPassword = async (email: string) => {
        const redirectTo = `${window.location.origin}/reset-password`;
        const { error } = await requireAuth().resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
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
