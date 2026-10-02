import { MAX_NAME_LENGTH, MAX_PIECES, MIN_PIECES, THEMES, UPLOAD_URL_PREFIX } from '@/lib/constants';
import type { PuzzleInput, Theme } from '@/lib/types';

/** Form state for one puzzle before it is validated into a PuzzleInput. */
export interface PuzzleDraft {
    key: string;
    name: string;
    pieces: string;
    theme: string;
    imageUrl: string;
}

export type DraftErrors = Partial<Record<keyof Omit<PuzzleDraft, 'key'>, string>>;

let counter = 0;

export function emptyDraft(overrides: Partial<Omit<PuzzleDraft, 'key'>> = {}): PuzzleDraft {
    return {
        key: `draft-${++counter}-${Date.now()}`,
        name: '',
        pieces: '',
        theme: '',
        imageUrl: '',
        ...overrides,
    };
}

/** A draft with no user-entered data yet (safe to drop when the required count shrinks). */
export function isDraftEmpty(draft: PuzzleDraft): boolean {
    return !draft.name.trim() && !draft.pieces && !draft.theme && !draft.imageUrl;
}

/** Client-side mirror of validatePuzzleInput so users get inline errors before a round trip. */
export function validateDraft(draft: PuzzleDraft): DraftErrors {
    const errors: DraftErrors = {};
    if (!draft.name.trim()) errors.name = 'Puzzle name is required.';
    else if (draft.name.length > MAX_NAME_LENGTH)
        errors.name = `Keep it under ${MAX_NAME_LENGTH} characters.`;
    const pieces = Number(draft.pieces);
    if (!draft.pieces.trim() || !Number.isInteger(pieces) || pieces < MIN_PIECES || pieces > MAX_PIECES)
        errors.pieces = 'Enter the number of pieces.';
    if (!THEMES.includes(draft.theme as Theme)) errors.theme = 'Choose a theme.';
    if (!draft.imageUrl.startsWith(UPLOAD_URL_PREFIX))
        errors.imageUrl = 'Please upload a photo of the puzzle.';
    return errors;
}

export function draftToInput(draft: PuzzleDraft): PuzzleInput {
    return {
        name: draft.name.trim(),
        pieces: Number(draft.pieces),
        theme: draft.theme as Theme,
        imageUrl: draft.imageUrl,
    };
}

/** Maps a server field path like "givenPuzzles.1.theme" back onto a draft error. */
export function applyServerFieldError(
    field: string | undefined,
    arrayField: string,
    message: string,
    drafts: PuzzleDraft[]
): Record<string, DraftErrors> | null {
    if (!field) return null;
    const match = field.match(new RegExp(`^${arrayField}\\.(\\d+)\\.(\\w+)$`));
    if (!match) return null;
    const draft = drafts[Number(match[1])];
    if (!draft) return null;
    return { [draft.key]: { [match[2] as keyof DraftErrors]: message } };
}
