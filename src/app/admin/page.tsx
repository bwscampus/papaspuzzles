"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Package, Search, Check, Trash2, Edit, Coins } from "lucide-react";
import type { Donation, TradeRecord, PuzzleRequest, RedemptionRecord } from "@/types/puzzle";
import { DEFAULT_THEME, FALLBACK_THEME } from "@/lib/puzzleConstants";

const normalizeThemeValue = (value: string) => {
    const normalizedWhitespace = value.trimStart().replace(/\s+/g, " ");
    return normalizedWhitespace
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
};

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("donations");
    const router = useRouter();

    const [donations, setDonations] = useState<Donation[]>([]);
    const [requests, setRequests] = useState<PuzzleRequest[]>([]);
    const [trades, setTrades] = useState<TradeRecord[]>([]);
    const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
    const [themeOptions, setThemeOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    // Edit Mode State
    const [editingId, setEditingId] = useState<string | null>(null);

    const [newPuzzle, setNewPuzzle] = useState({
        name: "",
        pieces: "",
        difficulty: "medium",
        theme: DEFAULT_THEME,
        condition: "good",
        email: "admin@papaspuzzles.co", // Default admin email
    });
    const [uploading, setUploading] = useState(false);
    const [puzzlePhoto, setPuzzlePhoto] = useState<File | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null); // For editing w/o new photo

    // Fetch data on mount
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();
            if (data.success) {
                setIsAuthenticated(true);
                fetchData();
            } else {
                setError("Invalid password");
            }
        } catch {
            setError("Login failed");
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [donationsRes, requestsRes, tradesRes, redemptionsRes] = await Promise.all([
                fetch("/api/admin/donations", { cache: "no-store" }),
                fetch("/api/admin/requests", { cache: "no-store" }),
                fetch("/api/admin/trades", { cache: "no-store" }),
                fetch("/api/redeem", { cache: "no-store" }),
            ]);

            const donationsData = await donationsRes.json();
            const requestsData = await requestsRes.json();
            const tradesData = await tradesRes.json();
            const redemptionsData = await redemptionsRes.json();

            setDonations(donationsData.data || []);
            setRequests(requestsData.data || []);
            setTrades(tradesData.data || []);
            setRedemptions(redemptionsData.data || []);
            await fetchThemes();
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchThemes = async () => {
        try {
            const res = await fetch("/api/themes", { cache: "no-store" });
            const data = await res.json();
            if (!res.ok) return;

            const themes = Array.isArray(data.data) ? data.data.filter((theme: unknown): theme is string => typeof theme === "string" && theme.trim().length > 0) : [];
            setThemeOptions(themes);
        } catch (err) {
            console.error("Failed to fetch themes", err);
        }
    };

    const markFulfilled = async (id: string) => {
        try {
            await fetch(`/api/admin/requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "confirmed" }),
            });
            // Refresh data
            fetchData();
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    const handlePublishDonation = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/donations/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "available" }),
            });
            if (res.ok) fetchData();
            else alert("Failed to publish donation");
        } catch (err) {
            console.error("Failed to publish", err);
        }
    };

    const handleAcceptBatch = async (batchId: string, donorEmail: string, donorUid?: string) => {
        try {
            const res = await fetch("/api/admin/donations/accept-batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ batchId, donorEmail, donorUid }),
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Accepted ${data.puzzlesPublished} puzzle(s). ${data.creditsAwarded} credit(s) awarded to donor.`);
                fetchData();
            } else {
                alert("Failed to accept batch: " + data.error);
            }
        } catch (err) {
            console.error("Failed to accept batch", err);
        }
    };

    const handleFulfillRedemption = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/redemptions/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "fulfilled" }),
            });
            if (res.ok) fetchData();
            else alert("Failed to update redemption");
        } catch (err) {
            console.error("Failed to fulfill redemption", err);
        }
    };

    const handleConfirmDropoff = async (tradeId: string) => {
        try {
            const res = await fetch(`/api/admin/trades/${tradeId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "confirm_dropoff" }),
            });
            if (res.ok) fetchData();
            else alert("Failed to confirm drop-off");
        } catch (err) {
            console.error("Failed to confirm drop-off", err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this puzzle? This action cannot be undone.")) return;

        try {
            const res = await fetch(`/api/admin/donations/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setDonations(prev => prev.filter(d => d.id !== id));
            } else {
                alert("Failed to delete puzzle");
            }
        } catch (err) {
            console.error("Failed to delete", err);
            alert("Error deleting puzzle");
        }
    };

    const handleEdit = (puzzle: Donation) => {
        setEditingId(puzzle.id);
        setNewPuzzle({
            name: puzzle.name,
            pieces: String(puzzle.pieces),
            difficulty: puzzle.difficulty || "medium",
            theme: puzzle.theme || DEFAULT_THEME,
            condition: puzzle.condition || "good",
            email: puzzle.email || "admin@papaspuzzles.co",
        });
        setCurrentImageUrl(puzzle.image_url);
        setPuzzlePhoto(null); // Reset new photo input
        setActiveTab("add-inventory");
    };

    const resetForm = () => {
        setNewPuzzle({
            name: "",
            pieces: "",
            difficulty: "medium",
            theme: DEFAULT_THEME,
            condition: "good",
            email: "admin@papaspuzzles.co",
        });
        setPuzzlePhoto(null);
        setCurrentImageUrl(null);
        setEditingId(null);
    };

    const handleSaveInventory = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: New items need a photo. Edits can use existing one.
        if (!editingId && !puzzlePhoto) return alert("Please select an image");

        setUploading(true);
        try {
            let imageUrl = currentImageUrl;

            // 1. Upload Image (if new one selected)
            if (puzzlePhoto) {
                const formData = new FormData();
                formData.append('puzzlePhoto', puzzlePhoto);

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                const uploadData = await uploadRes.json();

                if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
                imageUrl = uploadData.imageUrl;
            }

            // 2. Submit Data (Create or Update)
            const payload = {
                ...newPuzzle,
                theme: newPuzzle.theme.trim() || FALLBACK_THEME,
                image_url: imageUrl
            };

            let res;
            if (editingId) {
                // UPDATE
                res = await fetch(`/api/admin/donations/${editingId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                // CREATE
                res = await fetch('/api/admin/inventory', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            if (!res.ok) throw new Error(editingId ? 'Failed to update' : 'Failed to add');

            alert(editingId ? "Puzzle updated successfully!" : "Inventory added successfully!");

            resetForm();
            setActiveTab("donations");
            fetchData();

        } catch (err: unknown) {
            console.error(err);
            alert("Error: " + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setUploading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                    <div className="flex justify-center mb-6">
                        <div className="bg-gray-100 p-4 rounded-full">
                            <Lock className="w-8 h-8 text-gray-500" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-center mb-6">Admin Access</h1>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <button
                            type="submit"
                            className="w-full py-2 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-700 transition-colors"
                        >
                            Login
                        </button>
                    </form>
                    <div className="mt-4 text-center">
                        <Link href="/" className="text-sm text-gray-500 hover:underline">Back to Home</Link>
                    </div>
                </div>
            </div>
        );
    }

    const pendingRequestsCount = requests.filter(r => r.status !== 'confirmed').length;
    const pendingDonations = donations.filter(d => d.status === 'pending_admin_review');
    const pendingTradesCount = trades.filter(t => t.status !== 'completed').length;
    const pendingRedemptionsCount = redemptions.filter(r => r.status !== 'fulfilled').length;

    // Group pending donations by batch_id
    const donationBatches: Map<string, Donation[]> = new Map();
    for (const d of pendingDonations) {
        const key = d.batch_id || d.id; // fallback: each single donation is its own "batch"
        if (!donationBatches.has(key)) donationBatches.set(key, []);
        donationBatches.get(key)!.push(d);
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800">Puzzle Swap Admin</h1>
                <button
                    onClick={async () => {
                        await fetch("/api/admin/logout", { method: "POST" });
                        router.push("/");
                    }}
                    className="text-sm text-red-500 hover:underline"
                >
                    Logout
                </button>
            </nav>

            <main className="max-w-6xl mx-auto p-6">
                <div className="flex gap-4 mb-8">
                    <button
                        onClick={() => { setActiveTab("donations"); resetForm(); }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === "donations"
                            ? "bg-primary text-white shadow-md"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        <Package className="w-5 h-5" />
                        Donations ({donations.length})
                    </button>
                    <button
                        onClick={() => { setActiveTab("requests"); resetForm(); }}
                        className={`relative flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === "requests"
                            ? "bg-secondary text-gray-800 shadow-md"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        <Search className="w-5 h-5" />
                        Requests ({requests.length})
                        {pendingRequestsCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm animate-pulse">
                                {pendingRequestsCount} new
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => { setActiveTab("add-inventory"); resetForm(); }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === "add-inventory"
                            ? "bg-green-600 text-white shadow-md"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        <Package className="w-5 h-5" />
                        {editingId ? "Edit Inventory" : "Add Inventory"}
                    </button>
                    <button
                        onClick={() => { setActiveTab("pending-donations"); resetForm(); }}
                        className={`relative flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === "pending-donations"
                            ? "bg-yellow-500 text-white shadow-md"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        <Check className="w-5 h-5" />
                        Pending Donations
                        {pendingDonations.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm animate-pulse">
                                {pendingDonations.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => { setActiveTab("trades"); resetForm(); }}
                        className={`relative flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === "trades"
                            ? "bg-accent text-gray-800 shadow-md"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        <Search className="w-5 h-5" />
                        Trades ({trades.length})
                        {pendingTradesCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm animate-pulse">
                                {pendingTradesCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => { setActiveTab("redemptions"); resetForm(); }}
                        className={`relative flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === "redemptions"
                            ? "bg-purple-600 text-white shadow-md"
                            : "bg-white text-gray-600 hover:bg-gray-100"
                            }`}
                    >
                        <Coins className="w-5 h-5" />
                        Redemptions ({redemptions.length})
                        {pendingRedemptionsCount > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm animate-pulse">
                                {pendingRedemptionsCount}
                            </span>
                        )}
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading data...</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        {activeTab === "donations" && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Name</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Pieces</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Condition</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Contact</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {donations.map((d) => (
                                            <tr key={d.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium">{d.name}</td>
                                                <td className="px-6 py-4 text-gray-500">{d.pieces}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.condition === 'new' ? 'bg-green-100 text-green-700' :
                                                        d.condition === 'good' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {d.condition}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">{d.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${d.status === 'available' ? 'bg-green-100 text-green-700' :
                                                        'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {d.status || 'pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-400 text-sm flex items-center gap-2">
                                                    {new Date(d.created_at).toLocaleDateString()}
                                                    <button
                                                        onClick={() => handleEdit(d)}
                                                        className="text-blue-400 hover:text-blue-600 transition-colors p-1 hover:bg-blue-50 rounded"
                                                        title="Edit Puzzle"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(d.id)}
                                                        className="text-red-400 hover:text-red-600 transition-colors p-1 hover:bg-red-50 rounded"
                                                        title="Delete Puzzle"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {donations.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                                    No donations yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === "requests" && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Type/Theme</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Pieces</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Difficulty</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Contact</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {requests.map((r) => (
                                            <tr key={r.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium">{r.type}</td>
                                                <td className="px-6 py-4 text-gray-500">{r.pieces}</td>
                                                <td className="px-6 py-4 text-gray-500 capitalize">{r.difficulty}</td>
                                                <td className="px-6 py-4 text-gray-500">{r.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {r.status || 'pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {r.status !== 'confirmed' && (
                                                        <button
                                                            onClick={() => markFulfilled(r.id)}
                                                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium flex items-center gap-1 shadow-sm transition-colors"
                                                        >
                                                            <Check className="w-3 h-3" /> Accept Request
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {requests.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                                    No requests yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === "add-inventory" && (
                            <div className="p-8 max-w-2xl mx-auto">
                                <h2 className="text-xl font-bold text-gray-800 mb-6">
                                    {editingId ? "Edit Puzzle" : "Add New Inventory"}
                                </h2>
                                <form onSubmit={handleSaveInventory} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Puzzle Name</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                            value={newPuzzle.name}
                                            onChange={(e) => setNewPuzzle({ ...newPuzzle, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Pieces</label>
                                            <input
                                                required
                                                type="number"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                value={newPuzzle.pieces}
                                                onChange={(e) => setNewPuzzle({ ...newPuzzle, pieces: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                                            <input
                                                required
                                                type="text"
                                                list="theme-options"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                                value={newPuzzle.theme}
                                                onChange={(e) => setNewPuzzle({ ...newPuzzle, theme: normalizeThemeValue(e.target.value) })}
                                                placeholder="Type a theme or pick an existing one"
                                            />
                                            <datalist id="theme-options">
                                                {themeOptions.map((theme) => (
                                                    <option key={theme} value={theme} />
                                                ))}
                                            </datalist>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                id="puzzle-photo"
                                                onChange={(e) => setPuzzlePhoto(e.target.files?.[0] || null)}
                                            />
                                            <label htmlFor="puzzle-photo" className="cursor-pointer">
                                                {puzzlePhoto ? (
                                                    <div className="relative h-48 w-full">
                                                        <img
                                                            src={URL.createObjectURL(puzzlePhoto)}
                                                            alt="Preview"
                                                            className="h-full w-full object-contain mx-auto"
                                                        />
                                                        <div className="text-center mt-2 text-primary font-medium">{puzzlePhoto.name}</div>
                                                    </div>
                                                ) : currentImageUrl ? (
                                                    <div className="relative h-48 w-full group">
                                                        <img
                                                            src={currentImageUrl}
                                                            alt="Current"
                                                            className="h-full w-full object-contain mx-auto opacity-80 group-hover:opacity-100 transition-opacity"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                                            <span className="text-white font-medium">Click to change</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-500 py-8">
                                                        <span className="text-primary font-medium">Click to upload</span> or drag and drop
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        {editingId && (
                                            <button
                                                type="button"
                                                onClick={() => { resetForm(); setActiveTab("donations"); }}
                                                className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={uploading}
                                            className="flex-1 py-3 bg-primary text-white rounded-lg font-bold hover:bg-red-400 transition-colors disabled:opacity-50"
                                        >
                                            {uploading ? "Saving..." : editingId ? "Save Changes" : "Add to Inventory"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {activeTab === "pending-donations" && (
                            <div className="p-6 space-y-6">
                                {donationBatches.size === 0 && (
                                    <p className="text-center py-12 text-gray-400">No pending donations.</p>
                                )}
                                {Array.from(donationBatches.entries()).map(([batchKey, batchPuzzles]) => {
                                    const donor = batchPuzzles[0];
                                    const isBatch = !!donor.batch_id;
                                    const count = batchPuzzles.length;
                                    const creditsPreview = Math.max(0, count - 1); // shown as first-time estimate
                                    return (
                                        <div key={batchKey} className="border border-gray-200 rounded-xl overflow-hidden">
                                            {/* Batch header */}
                                            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
                                                <div>
                                                    <p className="font-semibold text-gray-800">
                                                        {count} puzzle{count !== 1 ? "s" : ""} from{" "}
                                                        <span className="text-primary">{donor.email}</span>
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        Submitted {new Date(donor.created_at).toLocaleDateString()}
                                                        {isBatch ? ` · Batch ID: ${batchKey.slice(0, 8)}…` : ""}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-gray-500">
                                                        ~{creditsPreview} credit{creditsPreview !== 1 ? "s" : ""} (first-time) or {count} (repeat)
                                                    </span>
                                                    {isBatch ? (
                                                        <button
                                                            onClick={() => handleAcceptBatch(donor.batch_id!, donor.email, donor.uid)}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold flex items-center gap-1 shadow-sm transition-colors"
                                                        >
                                                            <Check className="w-3 h-3" /> Accept All {count}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handlePublishDonation(donor.id)}
                                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold flex items-center gap-1 shadow-sm transition-colors"
                                                        >
                                                            <Check className="w-3 h-3" /> Publish
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Puzzles in this batch */}
                                            <table className="w-full text-left">
                                                <tbody className="divide-y divide-gray-100">
                                                    {batchPuzzles.map((d) => (
                                                        <tr key={d.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-3 w-20">
                                                                {d.image_url ? (
                                                                    <img src={d.image_url} alt={d.name} className="w-14 h-14 object-cover rounded-lg" />
                                                                ) : (
                                                                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300">
                                                                        <Package className="w-5 h-5" />
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-3 font-medium">{d.name}</td>
                                                            <td className="px-6 py-3 text-gray-500 text-sm">{d.pieces ? `${d.pieces} pcs` : "—"}</td>
                                                            <td className="px-6 py-3 text-gray-500 text-sm capitalize">{d.condition}</td>
                                                            <td className="px-6 py-3 text-gray-500 text-sm capitalize">{d.difficulty}</td>
                                                            <td className="px-6 py-3">
                                                                <button
                                                                    onClick={() => handleDelete(d.id)}
                                                                    className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                                                    title="Remove this puzzle"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activeTab === "redemptions" && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-gray-600">User</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Puzzles Requested</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Credits Spent</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Date</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {redemptions.map((r) => (
                                            <tr key={r.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-gray-600">{r.user_email}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {r.donation_names?.join(", ") || `${r.donation_ids?.length} puzzle(s)`}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="flex items-center gap-1 text-purple-700 font-semibold">
                                                        <Coins className="w-4 h-4" /> {r.credits_spent}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-400 text-sm">{new Date(r.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${r.status === "fulfilled" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>
                                                        {r.status === "fulfilled" ? "Fulfilled" : "Pending Pickup"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {r.status !== "fulfilled" && (
                                                        <button
                                                            onClick={() => handleFulfillRedemption(r.id)}
                                                            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm font-medium flex items-center gap-1 shadow-sm transition-colors"
                                                        >
                                                            <Check className="w-3 h-3" /> Mark Fulfilled
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {redemptions.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">No redemptions yet.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === "trades" && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-gray-600">User</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Donated</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Receiving</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Drop-off</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                                            <th className="px-6 py-4 font-semibold text-gray-600">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {trades.map((t) => (
                                            <tr key={t.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="font-medium">{t.user_name}</div>
                                                    <div className="text-sm text-gray-500">{t.user_email}</div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {(t.given_donation_names || []).join(", ") || t.given_donation_ids?.[0] || "—"}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {t.received_donation_name || t.received_donation_id || "—"}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 text-sm">
                                                    {t.dropoff_datetime || "—"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                                        {t.status || "pending"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {t.status !== "completed" && (
                                                        <button
                                                            onClick={() => handleConfirmDropoff(t.id)}
                                                            className="px-3 py-1 bg-primary text-white rounded hover:bg-red-400 text-sm font-medium flex items-center gap-1 shadow-sm transition-colors"
                                                        >
                                                            <Check className="w-3 h-3" /> Confirm Drop-off
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {trades.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                                    No trades yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
