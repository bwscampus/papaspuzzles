import { CONDITIONS, MAX_NAME_LENGTH, PIECES, THEMES, UPLOAD_URL_PREFIX } from '@/lib/constants';
import type { Condition, Pieces, PuzzleInput, Theme } from '@/lib/types';

/** Form state for one puzzle before it is validated into a PuzzleInput. */
export interface PuzzleDraft {
    key: string;
    name: string;
    pieces: string;
    theme: string;
    condition: string;
    imageUrl: string;
}

export type DraftErrors = Partial<Record<keyof Omit<PuzzleDraft, 'key'>, string>>;

let counter = 0;

export function emptyDraft(): PuzzleDraft {
    return {
        key: `draft-${++counter}-${Date.now()}`,
        name: '',
        pieces: '',
        theme: '',
        condition: 'good',
        imageUrl: '',
    };
}

/** Client-side mirror of validatePuzzleInput so users get inline errors before a round trip. */
export function validateDraft(draft: PuzzleDraft): DraftErrors {
    const errors: DraftErrors = {};
    if (!draft.name.trim()) errors.name = 'Puzzle name is required.';
    else if (draft.name.length > MAX_NAME_LENGTH)
        errors.name = `Keep it under ${MAX_NAME_LENGTH} characters.`;
    if (!PIECES.includes(Number(draft.pieces) as Pieces)) errors.pieces = 'Choose a piece count.';
    if (!THEMES.includes(draft.theme as Theme)) errors.theme = 'Choose a theme.';
    if (!CONDITIONS.includes(draft.condition as Condition)) errors.condition = 'Choose a condition.';
    if (!draft.imageUrl.startsWith(UPLOAD_URL_PREFIX))
        errors.imageUrl = 'Please upload a photo of the puzzle.';
    return errors;
}

export function draftToInput(draft: PuzzleDraft): PuzzleInput {
    return {
        name: draft.name.trim(),
        pieces: Number(draft.pieces) as Pieces,
        theme: draft.theme as Theme,
        condition: draft.condition as Condition,
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
