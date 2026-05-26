"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ArrowLeft, CheckCircle, Coins } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Donation } from "@/types/puzzle";

export default function RedeemPage() {
    const { user, loading: authLoading } = useAuth();
    const [credits, setCredits] = useState<number | null>(null);
    const [inventory, setInventory] = useState<Donation[]>([]);
    const [selected, setSelected] = useState<string[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoadingData(true);
        try {
            const [userRes, invRes] = await Promise.all([
                fetch(`/api/users?uid=${user.uid}`),
                fetch("/api/inventory"),
            ]);
            const userData = await userRes.json();
            const invData = await invRes.json();
            setCredits(userData.data?.credits ?? 0);
            setInventory(invData.data ?? []);
        } catch {
            setError("Failed to load data. Please refresh.");
        } finally {
            setLoadingData(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading) fetchData();
    }, [authLoading, fetchData]);

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= (credits ?? 0)) return prev; // can't select more than credits
            return [...prev, id];
        });
    };

    const handleRedeem = async () => {
        if (!user || selected.length === 0) return;
        setError("");
        setSubmitting(true);
        try {
            const res = await fetch("/api/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uid: user.uid,
                    userEmail: user.email,
                    donationIds: selected,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Redemption failed");
            setSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center text-gray-400">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
                        <Coins className="w-14 h-14 text-primary mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign in to use credits</h2>
                        <p className="text-gray-500 mb-6">You need an account to earn and spend puzzle credits.</p>
                        <Link href="/" className="px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-red-400 transition-colors">
                            Go Home &amp; Sign In
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-sm w-full">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Redemption Submitted!</h2>
                        <p className="text-gray-500 mb-2">
                            You redeemed <strong>{selected.length} credit{selected.length !== 1 ? "s" : ""}</strong> for {selected.length} puzzle{selected.length !== 1 ? "s" : ""}.
                        </p>
                        <p className="text-sm text-gray-400 mb-6">We&apos;ll contact you to arrange pickup.</p>
                        <Link href="/" className="inline-block px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-red-400 transition-colors">
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-1 p-4 sm:p-8">
                <div className="max-w-4xl mx-auto">
                    <Link href="/" className="inline-flex items-center text-gray-500 hover:text-primary mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                    </Link>

                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-3xl font-bold text-gray-800">Use My Credits</h1>
                        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-bold text-lg">
                            <Coins className="w-5 h-5" />
                            {loadingData ? "—" : credits} credit{credits !== 1 ? "s" : ""}
                        </div>
                    </div>
                    <p className="text-gray-500 mb-8">
                        Select up to <strong>{credits ?? 0}</strong> puzzle{(credits ?? 0) !== 1 ? "s" : ""} from the inventory below.
                        Each puzzle costs 1 credit.
                    </p>

                    {error && (
                        <div className="bg-red-50 text-red-500 border border-red-100 rounded-lg p-3 mb-6 text-sm">{error}</div>
                    )}

                    {loadingData ? (
                        <div className="text-center py-12 text-gray-400">Loading inventory...</div>
                    ) : inventory.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">No puzzles available right now. Check back soon!</div>
                    ) : (credits ?? 0) === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                            <Coins className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-gray-700 mb-1">No credits yet</h3>
                            <p className="text-gray-500 mb-5">Donate puzzles to earn credits you can spend here.</p>
                            <Link href="/donate" className="px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-red-400 transition-colors">
                                Donate Now
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                                {inventory.map(puzzle => {
                                    const isSelected = selected.includes(puzzle.id);
                                    const isDisabled = !isSelected && selected.length >= (credits ?? 0);
                                    return (
                                        <button
                                            key={puzzle.id}
                                            type="button"
                                            onClick={() => toggleSelect(puzzle.id)}
                                            disabled={isDisabled}
                                            className={`text-left rounded-xl border-2 overflow-hidden transition-all ${
                                                isSelected
                                                    ? "border-primary shadow-md scale-[1.02]"
                                                    : isDisabled
                                                    ? "border-gray-100 opacity-40 cursor-not-allowed"
                                                    : "border-gray-100 hover:border-primary/50 hover:shadow-sm cursor-pointer"
                                            }`}
                                        >
                                            {puzzle.image_url ? (
                                                <img
                                                    src={puzzle.image_url}
                                                    alt={puzzle.name}
                                                    className="w-full h-36 object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-300 text-4xl">
                                                    🧩
                                                </div>
                                            )}
                                            <div className="p-4 bg-white">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="font-semibold text-gray-800 text-sm leading-tight">{puzzle.name}</p>
                                                    {isSelected && (
                                                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                                            <CheckCircle className="w-4 h-4 text-white" />
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {puzzle.pieces ? `${puzzle.pieces} pieces · ` : ""}{puzzle.difficulty} · {puzzle.condition}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Sticky footer */}
                            <div className="sticky bottom-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 flex items-center justify-between gap-4">
                                <p className="text-gray-600 text-sm">
                                    {selected.length === 0
                                        ? "Select puzzles above"
                                        : `${selected.length} puzzle${selected.length !== 1 ? "s" : ""} selected · costs ${selected.length} credit${selected.length !== 1 ? "s" : ""}`}
                                </p>
                                <button
                                    onClick={handleRedeem}
                                    disabled={selected.length === 0 || submitting}
                                    className="px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {submitting ? "Submitting..." : `Redeem ${selected.length} Credit${selected.length !== 1 ? "s" : ""}`}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
