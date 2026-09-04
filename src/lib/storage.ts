import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Uploaded puzzle photos live on disk. On Railway, attach a volume and set
 * UPLOAD_DIR to a path inside its mount (e.g. /data/uploads) so files survive deploys.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

export function safeFileName(name: string): string {
    const base = name.split(/[\\/]/).pop() ?? 'upload';
    return base.replace(/[^A-Za-z0-9._-]/g, '_').slice(-100) || 'upload';
}

/** Writes the buffer to the upload directory and returns the public URL path. */
export async function saveUpload(buffer: Buffer, fileName: string): Promise<string> {
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeFileName(fileName)}`;
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, name), buffer);
    return `/uploads/${name}`;
}

/** Reads an uploaded file by its public name; null when the name is unsafe or missing. */
export async function readUpload(name: string): Promise<Buffer | null> {
    if (!SAFE_NAME.test(name) || name.startsWith('.')) return null;
    try {
        return await readFile(path.join(UPLOAD_DIR, name));
    } catch {
        return null;
    }
}

const CONTENT_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};

export function contentTypeFor(name: string): string {
    return CONTENT_TYPES[path.extname(name).toLowerCase()] ?? 'application/octet-stream';
}

export type SniffedImage = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/heic';

/** Detects the real image type from the file's leading bytes, ignoring the client-supplied MIME type. */
export function sniffImageType(buffer: Buffer): SniffedImage | null {
    if (buffer.length < 12) return null;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
        return 'image/png';
    if (buffer.subarray(0, 4).toString('ascii') === 'GIF8') return 'image/gif';
    if (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
        return 'image/webp';
    }
    if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
        const brand = buffer.subarray(8, 12).toString('ascii');
        if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heif'].includes(brand)) return 'image/heic';
    }
    return null;
}

export const EXTENSION_FOR: Record<SniffedImage, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/heic': '.heic',
};
