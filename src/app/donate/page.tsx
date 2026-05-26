"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { ArrowLeft, CheckCircle, Plus, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface PuzzleEntry {
    name: string;
    pieces: string;
    difficulty: "easy" | "medium" | "hard";
    theme: string;
    condition: "new" | "good" | "fair";
    photo: File | null;
    photoPreview: string | null;
}

const blankPuzzle = (): PuzzleEntry => ({
    name: "",
    pieces: "",
    difficulty: "medium",
    theme: "",
    condition: "good",
    photo: null,
    photoPreview: null,
});

function creditPreview(count: number) {
    if (count === 0) return 0;
    return Math.max(0, count - 1);
}

export default function DonatePage() {
    const { user } = useAuth();
    const [email, setEmail] = useState(user?.email ?? "");
    const [puzzles, setPuzzles] = useState<PuzzleEntry[]>([blankPuzzle()]);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const updatePuzzle = (index: number, field: keyof PuzzleEntry, value: string | File | null) => {
        setPuzzles(prev =>
            prev.map((p, i) => {
                if (i !== index) return p;
                if (field === "photo" && value instanceof File) {
                    return { ...p, photo: value, photoPreview: URL.createObjectURL(value) };
                }
                return { ...p, [field]: value };
            })
        );
    };

    const addPuzzle = () => setPuzzles(prev => [...prev, blankPuzzle()]);

    const removePuzzle = (index: number) =>
        setPuzzles(prev => prev.filter((_, i) => i !== index));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email.trim()) { setError("Please enter your contact email."); return; }
        if (puzzles.some(p => !p.name.trim())) { setError("Every puzzle needs a name."); return; }

        setSubmitting(true);
        try {
            const puzzlesWithUrls = await Promise.all(
                puzzles.map(async (p) => {
                    let image_url: string | null = null;
                    if (p.photo) {
                        const fd = new FormData();
                        fd.append("puzzlePhoto", p.photo);
                        const res = await fetch("/api/upload", { method: "POST", body: fd });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Photo upload failed");
                        image_url = data.imageUrl;
                    }
                    return {
                        name: p.name,
                        pieces: p.pieces,
                        difficulty: p.difficulty,
                        theme: p.theme,
                        condition: p.condition,
                        image_url,
                    };
                })
            );

            const res = await fetch("/api/donations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    uid: user?.uid ?? null,
                    puzzles: puzzlesWithUrls,
                }),
            });

            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || "Submission failed");
            }

            setSubmitted(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Navbar />
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-md w-full">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Donation Received!</h2>
                        <p className="text-gray-500 mb-2">
                            We received {puzzles.length} puzzle{puzzles.length > 1 ? "s" : ""}.
                            Our team will review and approve them shortly.
                        </p>
                        <p className="text-sm text-primary font-medium mb-6">
                            Once approved, your credits will be added to your account automatically.
                        </p>
                        <Link
                            href="/"
                            className="inline-block px-6 py-3 bg-primary text-white rounded-full font-bold hover:bg-red-400 transition-colors"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const estimatedCredits = creditPreview(puzzles.length);

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />
            <main className="flex-1 p-4 sm:p-8">
                <div className="max-w-2xl mx-auto">
                    <Link href="/" className="inline-flex items-center text-gray-500 hover:text-primary mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                    </Link>

                    <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-10">
                        <h1 className="text-3xl font-bold text-primary mb-1">Donate Puzzles</h1>
                        <p className="text-gray-500 mb-6">
                            Add all the puzzles you&apos;d like to donate. We&apos;ll review them and credit your account once approved.
                        </p>

                        {/* Credit explainer */}
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-8 text-sm">
                            <p className="font-semibold text-primary mb-1">How credits work</p>
                            <p className="text-gray-600">
                                <strong>First donation:</strong> donate 2 puzzles, earn 1 credit — then 1 credit per additional puzzle.
                                <br />
                                <strong>All future donations:</strong> 1 credit per puzzle, no minimum.
                            </p>
                            <p className="mt-2 font-medium text-gray-800">
                                Donating {puzzles.length} puzzle{puzzles.length !== 1 ? "s" : ""} → approx.{" "}
                                <span className="text-primary">{estimatedCredits} credit{estimatedCredits !== 1 ? "s" : ""}</span>
                                {" "}(if this is your first donation)
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-500 border border-red-100 p-3 rounded-lg mb-6 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Shared email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Your Contact Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>

                            {/* Puzzle cards */}
                            {puzzles.map((puzzle, index) => (
                                <div key={index} className="border border-gray-200 rounded-xl p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-800">Puzzle {index + 1}</h3>
                                        {puzzles.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removePuzzle(index)}
                                                className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Puzzle Name *</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                            placeholder="e.g. Solar System 500pc"
                                            value={puzzle.name}
                                            onChange={e => updatePuzzle(index, "name", e.target.value)}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Pieces</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                placeholder="e.g. 500"
                                                value={puzzle.pieces}
                                                onChange={e => updatePuzzle(index, "pieces", e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                                            <select
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                value={puzzle.difficulty}
                                                onChange={e => updatePuzzle(index, "difficulty", e.target.value as "easy" | "medium" | "hard")}
                                            >
                                                <option value="easy">Easy</option>
                                                <option value="medium">Medium</option>
                                                <option value="hard">Hard</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                placeholder="e.g. Animals, Space"
                                                value={puzzle.theme}
                                                onChange={e => updatePuzzle(index, "theme", e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                                            <select
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                value={puzzle.condition}
                                                onChange={e => updatePuzzle(index, "condition", e.target.value as "new" | "good" | "fair")}
                                            >
                                                <option value="new">Like New</option>
                                                <option value="good">Good (All pieces)</option>
                                                <option value="fair">Fair (Box worn)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
                                        <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                            <Upload className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                            {puzzle.photoPreview ? (
                                                <img src={puzzle.photoPreview} alt="preview" className="h-16 w-16 object-cover rounded" />
                                            ) : (
                                                <span className="text-sm text-gray-500">Upload a photo of the box</span>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={e => {
                                                    const file = e.target.files?.[0];
                                                    if (file) updatePuzzle(index, "photo", file);
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={addPuzzle}
                                className="w-full py-3 border-2 border-dashed border-primary/40 text-primary rounded-xl font-medium hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" /> Add Another Puzzle
                            </button>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 bg-primary text-white rounded-full font-bold text-lg hover:bg-red-400 transition-colors shadow-md disabled:opacity-50"
                            >
                                {submitting
                                    ? "Submitting..."
                                    : `Submit ${puzzles.length} Puzzle${puzzles.length !== 1 ? "s" : ""}`}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
