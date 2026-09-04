'use client';

import { useState, type FormEvent } from 'react';
import { PuzzleForm } from '@/components/PuzzleForm';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/client/api';
import {
    draftToInput,
    emptyDraft,
    validateDraft,
    type DraftErrors,
    type PuzzleDraft,
} from '@/lib/client/puzzleDraft';
import type { AdminPuzzle } from '@/lib/types';

export default function AdminInventoryPage() {
    const toast = useToast();
    const [draft, setDraft] = useState<PuzzleDraft>(() => emptyDraft());
    const [errors, setErrors] = useState<DraftErrors>({});
    const [busy, setBusy] = useState(false);
    const [added, setAdded] = useState<AdminPuzzle[]>([]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        const errs = validateDraft(draft);
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setBusy(true);
        try {
            const puzzle = await api.post<AdminPuzzle>('/api/admin/puzzles', draftToInput(draft));
            toast.success(`${puzzle.name} is now available on Explore.`);
            setAdded((list) => [puzzle, ...list]);
            setDraft(emptyDraft());
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="grid gap-8 lg:grid-cols-5">
            <form onSubmit={submit} noValidate className="lg:col-span-3">
                <Card>
                    <h2 className="mb-1 text-xl">Add a puzzle to inventory</h2>
                    <p className="mb-6 text-sm text-muted">
                        Same details as a donation, without any personal information. It goes live
                        immediately.
                    </p>
                    <PuzzleForm value={draft} onChange={setDraft} errors={errors} />
                    <div className="mt-6 flex justify-end">
                        <Button type="submit" loading={busy}>
                            Add to inventory
                        </Button>
                    </div>
                </Card>
            </form>
            <div className="lg:col-span-2">
                <h2 className="mb-3 text-lg">Added this session</h2>
                {added.length === 0 ? (
                    <Alert tone="info">Puzzles you add will appear here.</Alert>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {added.map((p) => (
                            <li
                                key={p.id}
                                className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-card"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                                <span className="font-semibold">{p.name}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
