'use client';

import { useMemo, useState } from 'react';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { useAdminData } from '@/components/admin/useAdminData';
import { PuzzleForm } from '@/components/PuzzleForm';
import { StatusBadge } from '@/components/StatusBadge';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/client/api';
import { draftToInput, validateDraft, type DraftErrors, type PuzzleDraft } from '@/lib/client/puzzleDraft';
import { CONDITION_LABELS, PUZZLE_STATUSES, PUZZLE_STATUS_LABELS, pieceLabel } from '@/lib/constants';
import type { AdminPuzzle } from '@/lib/types';

function toDraft(p: AdminPuzzle): PuzzleDraft {
    return {
        key: p.id,
        name: p.name,
        pieces: String(p.pieces),
        theme: p.theme,
        condition: p.condition,
        imageUrl: p.imageUrl,
    };
}

export default function AdminPuzzlesPage() {
    const [status, setStatus] = useState('');
    const { data, error, run, busyId, reload } = useAdminData<AdminPuzzle[]>(
        `/api/admin/puzzles${status ? `?status=${status}` : ''}`
    );
    const toast = useToast();
    const [editing, setEditing] = useState<AdminPuzzle | null>(null);
    const [draft, setDraft] = useState<PuzzleDraft | null>(null);
    const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
    const [saving, setSaving] = useState(false);

    const openEdit = (p: AdminPuzzle) => {
        setEditing(p);
        setDraft(toDraft(p));
        setDraftErrors({});
    };

    const saveEdit = async () => {
        if (!editing || !draft) return;
        const errs = validateDraft(draft);
        setDraftErrors(errs);
        if (Object.keys(errs).length) return;
        setSaving(true);
        try {
            await api.patch(`/api/admin/puzzles/${editing.id}`, draftToInput(draft));
            toast.success('Puzzle updated.');
            setEditing(null);
            await reload();
        } catch (err) {
            toast.error(errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const columns = useMemo<Column<AdminPuzzle>[]>(
        () => [
            {
                key: 'puzzle',
                header: 'Puzzle',
                render: (p) => (
                    <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
                        <div>
                            <p className="font-semibold">{p.name}</p>
                            <p className="text-xs text-muted">
                                {pieceLabel(p.pieces)} pcs · {p.theme} · {CONDITION_LABELS[p.condition]}
                            </p>
                        </div>
                    </div>
                ),
            },
            { key: 'status', header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
            {
                key: 'source',
                header: 'From',
                render: (p) => (
                    <div>
                        <p className="capitalize">{p.source}</p>
                        {p.submittedByEmail && <p className="text-xs text-muted">{p.submittedByEmail}</p>}
                    </div>
                ),
            },
            { key: 'date', header: 'Added', render: (p) => new Date(p.createdAt).toLocaleDateString() },
            {
                key: 'actions',
                header: 'Actions',
                className: 'text-right',
                render: (p) => {
                    const busy = busyId === p.id;
                    const locked = p.status === 'reserved' || p.status === 'traded' || p.status === 'claimed';
                    return (
                        <div className="flex flex-wrap justify-end gap-1">
                            {p.status === 'pending_review' && (
                                <Button
                                    size="sm"
                                    loading={busy}
                                    onClick={() =>
                                        run(
                                            p.id,
                                            () =>
                                                api.patch(`/api/admin/puzzles/${p.id}`, {
                                                    status: 'available',
                                                }),
                                            'Puzzle approved.'
                                        )
                                    }
                                >
                                    Approve
                                </Button>
                            )}
                            {(p.status === 'pending_review' || p.status === 'available') && (
                                <ConfirmButton
                                    label="Reject"
                                    busy={busy}
                                    onConfirm={() =>
                                        run(
                                            p.id,
                                            () =>
                                                api.patch(`/api/admin/puzzles/${p.id}`, {
                                                    status: 'rejected',
                                                }),
                                            'Puzzle rejected.'
                                        )
                                    }
                                />
                            )}
                            {p.status === 'rejected' && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    loading={busy}
                                    onClick={() =>
                                        run(
                                            p.id,
                                            () =>
                                                api.patch(`/api/admin/puzzles/${p.id}`, {
                                                    status: 'available',
                                                }),
                                            'Puzzle restored.'
                                        )
                                    }
                                >
                                    Restore
                                </Button>
                            )}
                            {!locked && (
                                <>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openEdit(p)}
                                        disabled={busy}
                                    >
                                        Edit
                                    </Button>
                                    <ConfirmButton
                                        label="Delete"
                                        confirmLabel="Delete"
                                        busy={busy}
                                        onConfirm={() =>
                                            run(
                                                p.id,
                                                () => api.del(`/api/admin/puzzles/${p.id}`),
                                                'Puzzle deleted.'
                                            )
                                        }
                                    />
                                </>
                            )}
                        </div>
                    );
                },
            },
        ],
        [busyId, run]
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Select
                    label="Status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    placeholder="All"
                    options={PUZZLE_STATUSES.map((s) => ({ value: s, label: PUZZLE_STATUS_LABELS[s] }))}
                    className="w-52"
                />
                <Button href="/admin/inventory" variant="secondary">
                    Add Inventory
                </Button>
            </div>

            {error ? (
                <Alert tone="error">{error}</Alert>
            ) : data === null ? (
                <div className="flex justify-center py-16 text-primary">
                    <Spinner className="h-8 w-8" />
                </div>
            ) : (
                <DataTable columns={columns} rows={data} emptyText="No puzzles with this status." />
            )}

            <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit puzzle">
                {draft && (
                    <div className="flex flex-col gap-6">
                        <PuzzleForm value={draft} onChange={setDraft} errors={draftErrors} />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setEditing(null)}>
                                Cancel
                            </Button>
                            <Button loading={saving} onClick={saveEdit}>
                                Save
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
