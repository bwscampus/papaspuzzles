"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { User, Search, LogIn, LogOut, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

import { getAuthErrorMessage } from "@/lib/authErrorMessages";

export default function Navbar() {
    const { user, loading, signIn, signUp, signOut, resetPassword } = useAuth();
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
    const [authError, setAuthError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setAuthError("");
        setIsSubmitting(true);
        try {
            if (authMode === "signin") {
                await signIn(email, password);
            } else {
                await signUp(email, password);
            }
            setShowAuthModal(false);
            setEmail("");
            setPassword("");
        } catch (err: unknown) {
            setAuthError(getAuthErrorMessage(err));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseModal = () => {
        setShowAuthModal(false);
        setEmail("");
        setPassword("");
        setAuthError("");
    };

    return (
        <nav className="bg-white shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-primary">
                                <Image
                                    src="/logo.png"
                                    alt="Papa's Puzzles Logo"
                                    fill
                                    className="object-cover object-center scale-[1.6]"
                                    priority
                                />
                            </div>
                            <span className="text-xl font-bold text-primary">Papa&apos;s Puzzles</span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-6">
                        <Link href="/explore" className="text-gray-600 hover:text-primary font-medium transition-colors flex items-center gap-1">
                            <Search className="w-4 h-4" />
                            Explore
                        </Link>
                        <Link href="/about" className="text-gray-600 hover:text-primary font-medium transition-colors">
                            About Us
                        </Link>
                        <Link href="/my-trades" className="text-gray-600 hover:text-primary font-medium transition-colors flex items-center gap-1">
                            <User className="w-4 h-4" />
                            My Trades
                        </Link>
                        <Link
                            href="/trade"
                            className="bg-primary text-white px-4 py-2 rounded-full font-bold hover:bg-red-400 transition-colors shadow-sm"
                        >
                            Start a Trade
                        </Link>

                        {!loading && (
                            user ? (
                                <div className="flex items-center gap-2">
                                    {user.photoURL ? (
                                        <img
                                            src={user.photoURL}
                                            alt={user.displayName || "User"}
                                            className="w-8 h-8 rounded-full border-2 border-primary"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                                            {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <button
                                        onClick={signOut}
                                        className="text-gray-600 hover:text-primary font-medium transition-colors flex items-center gap-1"
                                        title="Sign Out"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span className="hidden sm:inline">Sign Out</span>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowAuthModal(true)}
                                    className="text-gray-600 hover:text-primary font-medium transition-colors flex items-center gap-1"
                                >
                                    <LogIn className="w-4 h-4" />
                                    <span className="hidden sm:inline">Sign In</span>
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>

            {showAuthModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm relative">
                        <button
                            onClick={handleCloseModal}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold text-primary mb-6">
                            {authMode === "signin" ? "Sign In" : "Sign Up"}
                        </h2>
                        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-primary"
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-primary"
                            />
                            {authError && (
                                <p className="text-red-500 text-sm">{authError}</p>
                            )}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-primary text-white px-4 py-2 rounded-full font-bold hover:bg-red-400 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? "Please wait…" : authMode === "signin" ? "Sign In" : "Sign Up"}
                            </button>
                        </form>
                        {authMode === "signin" && (
                            <div className="text-center mt-2">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!email) { setAuthError("Enter your email above first."); return; }
                                        try {
                                            await resetPassword(email);
                                            setAuthError("");
                                            alert("Password reset email sent!");
                                        } catch (err: unknown) {
                                            setAuthError(getAuthErrorMessage(err));
                                        }
                                    }}
                                    className="text-sm text-gray-500 hover:text-primary hover:underline"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}
                        <p className="text-sm text-gray-500 text-center mt-4">
                            {authMode === "signin" ? (
                                <>
                                    Don&apos;t have an account?{" "}
                                    <button
                                        onClick={() => { setAuthMode("signup"); setAuthError(""); }}
                                        className="text-primary font-medium hover:underline"
                                    >
                                        Sign Up
                                    </button>
                                </>
                            ) : (
                                <>
                                    Already have an account?{" "}
                                    <button
                                        onClick={() => { setAuthMode("signin"); setAuthError(""); }}
                                        className="text-primary font-medium hover:underline"
                                    >
                                        Sign In
                                    </button>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            )}
        </nav>
    );
}
