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
    const name = `${Date.now()}-${safeFileName(fileName)}`;
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
