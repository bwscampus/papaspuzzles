import { validationError } from './api';
import {
    DROPOFF_SLOT_VALUES,
    EMAIL_RE,
    MAX_NAME_LENGTH,
    MAX_PIECES,
    MAX_PUZZLES_PER_SUBMISSION,
    MIN_PASSWORD_LENGTH,
    MIN_PIECES,
    THEMES,
    UPLOAD_URL_PREFIX,
    isServiceZip,
    normalizeZip,
} from './constants';
import type { PuzzleInput, Theme } from './types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateString(value: unknown, field: string, label = field, maxLength = 200): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw validationError(`${label} is required.`, field);
    }
    if (value.length > maxLength) {
        throw validationError(`${label} must be ${maxLength} characters or fewer.`, field);
    }
    return value.trim();
}

export function validateEmail(value: unknown, field = 'email'): string {
    const email = validateString(value, field, 'Email', 254);
    if (!EMAIL_RE.test(email)) {
        throw validationError('Please enter a valid email address.', field);
    }
    return email.toLowerCase();
}

export function validatePassword(value: unknown, field = 'password'): string {
    if (typeof value !== 'string' || value.length < MIN_PASSWORD_LENGTH) {
        throw validationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, field);
    }
    if (value.length > 200) {
        throw validationError('Password is too long.', field);
    }
    return value;
}

export function validateEnum<T extends string | number>(
    value: unknown,
    allowed: readonly T[],
    field: string,
    label = field
): T {
    const candidate = typeof value === 'string' && typeof allowed[0] === 'number' ? Number(value) : value;
    if (!allowed.includes(candidate as T)) {
        throw validationError(`${label} must be one of: ${allowed.join(', ')}.`, field);
    }
    return candidate as T;
}

export function validateUuid(value: unknown, field: string, label = field): string {
    if (typeof value !== 'string' || !UUID_RE.test(value)) {
        throw validationError(`${label} is invalid.`, field);
    }
    return value.toLowerCase();
}

export function validateUuidArray(value: unknown, field: string, max: number, label = field): string[] {
    if (!Array.isArray(value) || value.length === 0) {
        throw validationError(`${label} is required.`, field);
    }
    if (value.length > max) {
        throw validationError(`${label} may contain at most ${max} items.`, field);
    }
    return Array.from(new Set(value.map((v) => validateUuid(v, field, label))));
}

export function validateDate(value: unknown, field: string, label = field): string {
    if (typeof value !== 'string' || !ISO_DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
        throw validationError(`${label} must be a date (YYYY-MM-DD).`, field);
    }
    return value;
}

export function validateDropoffSlot(value: unknown, field = 'dropoffSlot'): string {
    return validateEnum(value, DROPOFF_SLOT_VALUES, field, 'Drop-off time');
}

export function validateZip(value: unknown, field = 'zip'): string {
    const zip = typeof value === 'string' ? normalizeZip(value) : null;
    if (zip === null) {
        throw validationError('Please enter a 5-digit ZIP code.', field);
    }
    return zip;
}

/** A well-formed ZIP that is also inside the service area. */
export function validateServiceZip(value: unknown, field = 'zip'): string {
    const zip = validateZip(value, field);
    if (!isServiceZip(zip)) {
        throw validationError(
            "Sorry, we're only in Los Angeles right now. You can join the waitlist instead.",
            field
        );
    }
    return zip;
}

export function validateImageUrl(value: unknown, field: string): string {
    const url = validateString(value, field, 'Photo', 300);
    if (!url.startsWith(UPLOAD_URL_PREFIX) || url.includes('..')) {
        throw validationError('Please upload a photo of the puzzle.', field);
    }
    return url;
}

/** Any whole number of pieces within the sane bounds; numeric strings from forms are accepted. */
export function validatePieces(value: unknown, field: string): number {
    const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < MIN_PIECES || n > MAX_PIECES) {
        throw validationError(
            `Piece count must be a whole number between ${MIN_PIECES} and ${MAX_PIECES}.`,
            field
        );
    }
    return n;
}

/** Validates one puzzle. `prefix` names the array slot for field-level errors, e.g. "puzzles.0". */
export function validatePuzzleInput(raw: unknown, prefix = 'puzzle'): PuzzleInput {
    const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    return {
        name: validateString(p.name, `${prefix}.name`, 'Puzzle name', MAX_NAME_LENGTH),
        pieces: validatePieces(p.pieces, `${prefix}.pieces`),
        theme: validateEnum<Theme>(p.theme, THEMES, `${prefix}.theme`, 'Theme'),
        imageUrl: validateImageUrl(p.imageUrl, `${prefix}.imageUrl`),
    };
}

export function validatePuzzleInputs(
    raw: unknown,
    field: string,
    { min, max = MAX_PUZZLES_PER_SUBMISSION }: { min: number; max?: number }
): PuzzleInput[] {
    if (!Array.isArray(raw)) {
        throw validationError('Please add at least one puzzle.', field);
    }
    if (raw.length < min) {
        throw validationError(
            min === 1 ? 'Please add at least one puzzle.' : `Please add ${min} puzzles.`,
            field
        );
    }
    if (raw.length > max) {
        throw validationError(`You can submit at most ${max} puzzles at a time.`, field);
    }
    return raw.map((item, i) => validatePuzzleInput(item, `${field}.${i}`));
}
