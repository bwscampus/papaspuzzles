'use client';

import { CONDITIONS, CONDITION_LABELS, PIECES, THEMES, pieceLabel } from '@/lib/constants';
import type { DraftErrors, PuzzleDraft } from '@/lib/client/puzzleDraft';
import { PhotoUpload } from './PhotoUpload';
import { Input, Select } from './ui/Field';

/** The one puzzle-entry form, used by Donate, Start a Trade, and admin Add Inventory. */
export function PuzzleForm({
    value,
    onChange,
    errors = {},
}: {
    value: PuzzleDraft;
    onChange: (next: PuzzleDraft) => void;
    errors?: DraftErrors;
}) {
    const set = (patch: Partial<PuzzleDraft>) => onChange({ ...value, ...patch });

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Input
                label="Puzzle name"
                value={value.name}
                onChange={(e) => set({ name: e.target.value })}
                error={errors.name}
                className="sm:col-span-2"
                placeholder="e.g. Salt Lake Winter"
            />
            <Select
                label="Pieces"
                value={value.pieces}
                onChange={(e) => set({ pieces: e.target.value })}
                error={errors.pieces}
                placeholder="Choose…"
                options={PIECES.map((p) => ({ value: p, label: pieceLabel(p) }))}
            />
            <Select
                label="Theme"
                value={value.theme}
                onChange={(e) => set({ theme: e.target.value })}
                error={errors.theme}
                placeholder="Choose…"
                options={THEMES.map((t) => ({ value: t, label: t }))}
            />
            <Select
                label="Condition"
                value={value.condition}
                onChange={(e) => set({ condition: e.target.value })}
                error={errors.condition}
                options={CONDITIONS.map((c) => ({ value: c, label: CONDITION_LABELS[c] }))}
            />
            <div className="sm:col-span-2">
                <PhotoUpload
                    value={value.imageUrl}
                    onChange={(imageUrl) => set({ imageUrl })}
                    error={errors.imageUrl}
                />
            </div>
        </div>
    );
}
