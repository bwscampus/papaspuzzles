"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { getAuthErrorMessage } from "@/lib/authErrorMessages";
import { CheckCircle, Upload, ArrowRight, ArrowLeft, LogIn } from "lucide-react";
import { Donation } from "@/types/puzzle";

const TIME_SLOTS = ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"];

interface DonationForm {
    name: string;
    pieces: string;
    type: string;
    condition: string;
    image: string;
}

type TradeMode = "swap" | "donate_only" | "claim_with_credit";

const emptyDonation = (): DonationForm => ({
    name: "", pieces: "", type: "Animals", condition: "good", image: ""
});

export default function TradePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <TradeForm />
        </Suspense>
    );
}

function TradeForm() {
    const searchParams = useSearchParams();
    const wantedId = searchParams.get("wanted");
    const isClaimFirst = !!wantedId;
    const { user, loading: authLoading, signIn, signUp } = useAuth();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [inventory, setInventory] = useState<Donation[]>([]);
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [credits, setCredits] = useState(0);
    const [tradeMode, setTradeMode] = useState<TradeMode>("swap");
    const [userTierLoaded, setUserTierLoaded] = useState(false);

    const [authEmail, setAuthEmail] = useState("");
    const [authPassword, setAuthPassword] = useState("");
    const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
    const [authError, setAuthError] = useState("");
    const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

    const [userInfo, setUserInfo] = useState({ name: "", email: "" });
    const [donations, setDonations] = useState<DonationForm[]>([emptyDonation()]);
    const [selectedPuzzleId, setSelectedPuzzleId] = useState<string | null>(wantedId || null);
    const [dropoffDate, setDropoffDate] = useState("");
    const [dropoffTime, setDropoffTime] = useState(TIME_SLOTS[0]);

    useEffect(() => {
        if (!user) return;

        setUserInfo({
            name: user.displayName || "",
            email: user.email || "",
        });

        const fetchUserTier = async () => {
            try {
                const res = await fetch(`/api/users?uid=${user.uid}`, { cache: "no-store" });
                if (res.ok) {
                    const data = await res.json();
                    const firstTime = data.data?.tradeTier === "first-time";
                    const accountCredits = Number(data.data?.credits ?? 0);
                    setIsFirstTime(firstTime);
                    setCredits(accountCredits);
                } else {
                    setIsFirstTime(true);
                    setCredits(0);
                }
            } catch {
                setIsFirstTime(true);
                setCredits(0);
            } finally {
                setUserTierLoaded(true);
            }
        };

        fetchUserTier();
    }, [user]);

    useEffect(() => {
        if (tradeMode === "claim_with_credit") {
            setDonations([]);
            return;
        }

        if (tradeMode === "swap" && isFirstTime) {
            setDonations([emptyDonation(), emptyDonation()]);
            return;
        }

        setDonations([emptyDonation()]);
    }, [tradeMode, isFirstTime]);

    // Advance past auth gate once user is signed in and tier is loaded
    useEffect(() => {
        if (step === 1 && user && userTierLoaded) {
            setStep(2);
        }
    }, [step, user, userTierLoaded]);

    useEffect(() => {
        const inventoryFetchStep = isClaimFirst ? 2 : 4;
        if (step === inventoryFetchStep) fetchInventory();
    }, [step, isClaimFirst]);

    const fetchInventory = async () => {
        try {
            const res = await fetch("/api/inventory", { cache: "no-store" });
            const data = await res.json();
            setInventory(data.data || []);
        } catch (err) {
            console.error("Failed to load inventory", err);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (!e.target.files?.[0]) return;
        const formData = new FormData();
        formData.append("puzzlePhoto", e.target.files[0]);
        try {
            setLoading(true);
            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (data.imageUrl) updateDonation(index, "image", data.imageUrl);
        } catch (err) {
            console.error("Upload failed", err);
        } finally {
            setLoading(false);
        }
    };

    const updateDonation = (index: number, field: keyof DonationForm, value: string) => {
        setDonations(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
    };

    const handleSubmitTrade = async () => {
        if (tradeMode !== "donate_only" && !selectedPuzzleId) return;
        setLoading(true);
        try {
            const res = await fetch("/api/trade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mode: tradeMode,
                    userName: userInfo.name,
                    userEmail: userInfo.email,
                    uid: user?.uid || null,
                    donations: donations.map(d => ({
                        name: d.name,
                        pieces: d.pieces,
                        type: d.type,
                        condition: d.condition,
                        image: d.image,
                    })),
                    wantedPuzzleId: tradeMode === "donate_only" ? null : selectedPuzzleId,
                    dropoffDatetime: dropoffDate ? `${dropoffDate} ${dropoffTime}` : null,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                if (tradeMode === "donate_only") {
                    setCredits((prev) => prev + Number(data.creditsEarned ?? 0));
                } else if (tradeMode === "claim_with_credit") {
                    setCredits((prev) => Math.max(0, prev - 1));
                }
                setStep(6);
            } else {
                alert(data.error || "Unable to submit request");
            }
        } catch (err) {
            console.error("Trade failed", err);
        } finally {
            setLoading(false);
        }
    };

    const allDonationsValid = tradeMode === "claim_with_credit"
        ? true
        : donations.every(d => d.name && d.pieces && d.image);
    const claimTargetId = wantedId || selectedPuzzleId;
    const selectedPuzzle = useMemo(
        () => inventory.find((puzzle) => puzzle.id === claimTargetId),
        [inventory, claimTargetId],
    );
    const selectedPuzzleName = selectedPuzzle?.name || "your selected puzzle";

    const getSuccessMessage = () => {
        if (tradeMode === "donate_only") {
            return "Thank you for donating! We have received your drop-off request and added credits to your account.";
        }

        if (isClaimFirst && tradeMode === "swap") {
            return (
                <>
                    Your trade for <strong>{selectedPuzzleName}</strong> has been submitted! We&apos;ll confirm your drop-off appointment and reach out with pickup details.
                </>
            );
        }

        if (isClaimFirst && tradeMode === "claim_with_credit") {
            return (
                <>
                    Your claim for <strong>{selectedPuzzleName}</strong> has been submitted! We&apos;ll confirm your pickup appointment shortly.
                </>
            );
        }

        if (tradeMode === "claim_with_credit") {
            return "Your credit claim has been submitted! We will confirm your pickup appointment shortly.";
        }

        return "Thank you for trading with Papa's Puzzles! We have received your request. We will confirm your drop-off appointment and reach out with details.";
    };

    const renderStep1 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 text-center py-8">
            <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
                    <LogIn className="w-10 h-10 text-primary" />
                </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Sign In to Start Trading</h2>
            <p className="text-gray-500 max-w-sm mx-auto">
                Sign in to start your puzzle trade. It only takes a second!
            </p>
            <form
                onSubmit={async (e) => {
                    e.preventDefault();
                    if (isSubmittingAuth) return;
                    setAuthError("");
                    setIsSubmittingAuth(true);
                    try {
                        if (authMode === "signin") {
                            await signIn(authEmail, authPassword);
                        } else {
                            await signUp(authEmail, authPassword);
                        }
                    } catch (err: unknown) {
                        setAuthError(getAuthErrorMessage(err));
                    } finally {
                        setIsSubmittingAuth(false);
                    }
                }}
                className="flex flex-col gap-4 max-w-sm mx-auto"
            >
                <input
                    type="email"
                    placeholder="Email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    className="border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-primary"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    className="border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-primary"
                />
                {authError && <p className="text-red-500 text-sm">{authError}</p>}
                <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="bg-primary text-white px-6 py-3 rounded-full font-bold hover:bg-red-400 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isSubmittingAuth ? "Please wait…" : authMode === "signin" ? "Sign In" : "Sign Up"}
                </button>
            </form>
            <p className="text-sm text-gray-500">
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
    );

    const renderStep2 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold text-gray-800">Step 1: Your Info</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                    <input
                        type="text"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                        placeholder="John Doe"
                        value={userInfo.name}
                        onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                        type="email"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                        placeholder="john@example.com"
                        value={userInfo.email}
                        onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                    />
                </div>
            </div>
            <button
                onClick={() => setStep(3)}
                disabled={!userInfo.name || !userInfo.email}
                className="w-full py-3 bg-primary text-white rounded-full font-bold hover:bg-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                Next Step <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );

    const renderDonationForm = (donation: DonationForm, index: number) => (
        <div key={index} className="border border-gray-100 rounded-xl p-4 space-y-4">
            {donations.length > 1 && (
                <h3 className="font-semibold text-gray-700">Puzzle {index + 1}</h3>
            )}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Puzzle Name</label>
                <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                    placeholder="e.g. Golden Gate Bridge"
                    value={donation.name}
                    onChange={(e) => updateDonation(index, "name", e.target.value)}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white"
                        value={donation.type}
                        onChange={(e) => updateDonation(index, "type", e.target.value)}
                    >
                        <option value="Animals">Animals</option>
                        <option value="Landscape">Landscape</option>
                        <option value="Art">Art</option>
                        <option value="Food">Food</option>
                        <option value="Cityscape">Cityscape</option>
                        <option value="Movies">Movies</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pieces</label>
                    <select
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white"
                        value={donation.pieces}
                        onChange={(e) => updateDonation(index, "pieces", e.target.value)}
                    >
                        <option value="">Select...</option>
                        <option value="100">100</option>
                        <option value="300">300</option>
                        <option value="500">500</option>
                        <option value="1000">1000</option>
                        <option value="2000+">2000+</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white"
                    value={donation.condition}
                    onChange={(e) => updateDonation(index, "condition", e.target.value)}
                >
                    <option value="new">New / Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Photo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary transition-colors cursor-pointer relative">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, index)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {loading ? (
                        <span className="text-gray-500">Uploading...</span>
                    ) : donation.image ? (
                        <div className="relative h-32 w-full">
                            <img src={donation.image} alt="Preview" className="h-full w-full object-contain" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-gray-500">
                            <Upload className="w-8 h-8 mb-2" />
                            <span>Click to upload photo</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold text-gray-800">
                {isClaimFirst ? "Step 1: How would you like to get it?" : `Step 2: Donate Your Puzzle${donations.length > 1 ? "s" : ""}`}
            </h2>
            {isClaimFirst && (
                <p className="text-gray-500">Choose how you&apos;d like to claim this puzzle.</p>
            )}
            <div className={`grid gap-3 ${isClaimFirst ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                <button
                    type="button"
                    onClick={() => setTradeMode("swap")}
                    className={`text-left border rounded-xl p-3 transition-colors ${tradeMode === "swap" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
                >
                    <p className="font-semibold text-gray-800">Swap</p>
                    <p className="text-xs text-gray-500">Donate and claim now</p>
                </button>
                {!isClaimFirst && (
                    <button
                        type="button"
                        onClick={() => setTradeMode("donate_only")}
                        className={`text-left border rounded-xl p-3 transition-colors ${tradeMode === "donate_only" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
                    >
                        <p className="font-semibold text-gray-800">Donate Only</p>
                        <p className="text-xs text-gray-500">Earn credits for later</p>
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => setTradeMode("claim_with_credit")}
                    disabled={credits < 1}
                    className={`text-left border rounded-xl p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${tradeMode === "claim_with_credit" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
                >
                    <p className="font-semibold text-gray-800">Claim with Credit</p>
                    <p className="text-xs text-gray-500">Credits available: {credits}</p>
                </button>
            </div>
            {tradeMode === "swap" && isFirstTime && (
                <div className="bg-accent/30 border border-accent rounded-xl p-4 text-sm text-gray-700">
                    🧩 <strong>First-time traders donate 2 puzzles and receive 1</strong> — to help us build up our library!
                </div>
            )}
            {tradeMode === "claim_with_credit" ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                    You are using 1 credit to claim a puzzle without donating this time.
                </div>
            ) : (
                donations.map((donation, index) => renderDonationForm(donation, index))
            )}
            <div className="flex gap-3">
                <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-full font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                    onClick={() => setStep((tradeMode === "donate_only" || isClaimFirst) ? 5 : 4)}
                    disabled={!allDonationsValid}
                    className="flex-[2] py-3 bg-primary text-white rounded-full font-bold hover:bg-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    Next Step <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold text-gray-800">Step 3: Choose a Puzzle</h2>
            <p className="text-gray-500">
                {tradeMode === "claim_with_credit"
                    ? "Select a puzzle to claim using your credit."
                    : "Select a puzzle from our inventory to complete your trade."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                {inventory.map((puzzle) => (
                    <div
                        key={puzzle.id}
                        onClick={() => setSelectedPuzzleId(puzzle.id)}
                        className={`cursor-pointer border-2 rounded-xl overflow-hidden transition-all hover:shadow-md ${selectedPuzzleId === puzzle.id ? "border-primary ring-2 ring-primary ring-opacity-50" : "border-gray-100"}`}
                    >
                        <div className="h-40 bg-gray-100 relative">
                            {puzzle.image_url ? (
                                <img src={puzzle.image_url} alt={puzzle.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <Upload className="w-8 h-8" />
                                </div>
                            )}
                            <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                                {puzzle.pieces} pcs
                            </div>
                        </div>
                        <div className="p-3">
                            <h3 className="font-bold text-gray-800 truncate">{puzzle.name}</h3>
                            <p className="text-sm text-gray-500">{puzzle.theme} • {puzzle.difficulty}</p>
                        </div>
                    </div>
                ))}
                {inventory.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 rounded-xl">
                        No puzzles available right now. Check back later!
                    </div>
                )}
            </div>
            <div className="flex gap-3 pt-4">
                <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-full font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                    onClick={() => setStep(5)}
                    disabled={!selectedPuzzleId}
                    className="flex-[2] py-3 bg-primary text-white rounded-full font-bold hover:bg-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    Next Step <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    const renderStep5 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-2xl font-bold text-gray-800">
                {tradeMode === "donate_only" || isClaimFirst ? "Step 3: Schedule Drop-off" : "Step 4: Schedule Drop-off"}
            </h2>
            <p className="text-gray-500">
                {tradeMode === "donate_only"
                    ? "Choose when you would like to drop off your puzzle donation."
                    : "Choose when you would like to drop off your puzzle(s) and pick up your new one."}
            </p>
            {isClaimFirst && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                    ✓ Picking up: <strong>{selectedPuzzleName}</strong>
                </div>
            )}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
                    <input
                        type="date"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                        value={dropoffDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setDropoffDate(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
                    <select
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white"
                        value={dropoffTime}
                        onChange={(e) => setDropoffTime(e.target.value)}
                    >
                        {TIME_SLOTS.map(slot => (
                            <option key={slot} value={slot}>{slot}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex gap-3">
                <button
                    onClick={() => setStep((tradeMode === "donate_only" || isClaimFirst) ? 3 : 4)}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-full font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                    onClick={handleSubmitTrade}
                    disabled={!dropoffDate || loading}
                    className="flex-[2] py-3 bg-secondary text-gray-800 rounded-full font-bold hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                    {loading ? "Processing..." : tradeMode === "donate_only" ? "Confirm Donation" : "Confirm Trade"}
                </button>
            </div>
        </div>
    );

    const renderSuccess = () => (
        <div className="text-center space-y-6 py-12 animate-in zoom-in duration-300">
            <div className="flex justify-center">
                <CheckCircle className="w-24 h-24 text-secondary" />
            </div>
            <h2 className="text-3xl font-bold text-primary">Trade Submitted!</h2>
            <p className="text-gray-600 max-w-md mx-auto">
                {getSuccessMessage()}
            </p>
            <div className="pt-6">
                <a
                    href="/my-trades"
                    className="inline-block px-8 py-3 bg-primary text-white rounded-full font-bold hover:bg-red-400 transition-colors shadow-lg"
                >
                    View My Trades
                </a>
            </div>
        </div>
    );

    // Claim-first flow skips step 4, so progress maps step 2->1, step 3->2, step 5->3.
    const claimFirstProgressByStep: Record<number, number> = { 2: 1, 3: 2, 5: 3 };
    const progressStep = isClaimFirst
        ? (claimFirstProgressByStep[step] ?? 0)
        : step - 1; // steps 2-5 map to progress 1-4
    const progressMarkers = isClaimFirst ? [1, 2, 3] : [1, 2, 3, 4];

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="max-w-3xl mx-auto p-4 sm:p-8">
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-10 min-h-[600px]">
                    {step >= 2 && step <= 5 && (
                        <div className="flex justify-between mb-8 relative">
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10 rounded-full" />
                            {progressMarkers.map((s) => (
                                <div
                                    key={s}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${progressStep >= s ? "bg-primary text-white" : "bg-gray-100 text-gray-400"}`}
                                >
                                    {s}
                                </div>
                            ))}
                        </div>
                    )}
                    {isClaimFirst && step >= 2 && step <= 5 && (
                        <div className="mb-6 border border-primary/20 bg-primary/5 rounded-xl p-4">
                            <p className="text-sm font-semibold text-primary mb-3">🧩 You&apos;re claiming this puzzle</p>
                            <div className="flex items-center gap-3">
                                {selectedPuzzle?.image_url ? (
                                    <img
                                        src={selectedPuzzle.image_url}
                                        alt={selectedPuzzle.name || "Selected puzzle image"}
                                        className="w-16 h-16 rounded-lg object-cover bg-white"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400">
                                        <Upload className="w-6 h-6" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-gray-800">{selectedPuzzle?.name || "Unable to load puzzle details"}</p>
                                    {selectedPuzzle?.pieces && (
                                        <p className="text-sm text-gray-500">{selectedPuzzle.pieces} pieces</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {authLoading && (
                        <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
                    )}
                    {!authLoading && step === 1 && !user && renderStep1()}
                    {!authLoading && step === 1 && user && !userTierLoaded && (
                        <div className="flex items-center justify-center h-64 text-gray-400">Loading your profile...</div>
                    )}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                    {step === 5 && renderStep5()}
                    {step === 6 && renderSuccess()}
                </div>
            </main>
        </div>
    );
}
