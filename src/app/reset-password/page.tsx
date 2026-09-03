"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getAuthErrorMessage } from "@/lib/authErrorMessages";

export default function ResetPasswordPage() {
    const [ready, setReady] = useState(false);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!supabase) return;
        // The reset link signs the user in with a recovery session before landing here.
        supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setReady(!!session);
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase || submitting) return;
        setError("");
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirm) {
            setError("Passwords do not match.");
            return;
        }
        setSubmitting(true);
        const { error: updateError } = await supabase.auth.updateUser({ password });
        setSubmitting(false);
        if (updateError) {
            setError(getAuthErrorMessage(updateError));
            return;
        }
        setDone(true);
    };

    return (
        <div className="max-w-md mx-auto px-4 py-16">
            <div className="bg-white rounded-2xl shadow-lg p-8">
                <h1 className="text-2xl font-bold text-primary mb-6">Reset your password</h1>

                {done ? (
                    <div className="flex flex-col gap-4">
                        <p className="text-gray-700">Your password has been updated.</p>
                        <Link
                            href="/"
                            className="bg-primary text-white px-4 py-2 rounded-full font-bold hover:bg-red-400 transition-colors shadow-sm text-center"
                        >
                            Back to home
                        </Link>
                    </div>
                ) : !ready ? (
                    <p className="text-gray-500">
                        Open this page from the link in your password reset email. If the link has expired,
                        request a new one from the Sign In dialog.
                    </p>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <input
                            type="password"
                            placeholder="New password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-primary"
                        />
                        <input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            required
                            className="border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-primary"
                        />
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-primary text-white px-4 py-2 rounded-full font-bold hover:bg-red-400 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {submitting ? "Saving…" : "Save new password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
