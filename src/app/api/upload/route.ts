import { NextResponse } from 'next/server';
import convert from 'heic-convert';
import { supabaseAdmin, PUZZLE_BUCKET } from '@/lib/supabaseAdmin';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
]);

function safeFileName(name: string): string {
    const base = name.split(/[\\/]/).pop() ?? 'upload';
    return base.replace(/[^A-Za-z0-9._-]/g, '_').slice(-100);
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('puzzlePhoto') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
        }

        const isHeic = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
        const mimeToCheck = isHeic ? 'image/heic' : file.type;
        if (!ALLOWED_MIME_TYPES.has(mimeToCheck)) {
            return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WebP, GIF, and HEIC are allowed.' }, { status: 400 });
        }

        let buffer: Buffer = Buffer.from(await file.arrayBuffer());
        let mimeType = file.type;
        let fileName = file.name;

        // HEIC conversion
        if (isHeic || mimeType === 'image/heic') {
            try {
                const converted = await convert({
                    buffer: buffer,
                    format: 'JPEG',
                    quality: 0.8
                });
                buffer = Buffer.from(new Uint8Array(converted));
                mimeType = 'image/jpeg';
                fileName = fileName.replace(/\.hei[cf]$/i, '.jpg');
            } catch (convError) {
                console.error('HEIC conversion failed:', convError);
                throw new Error('Failed to convert HEIC image');
            }
        }

        const storage = supabaseAdmin().storage.from(PUZZLE_BUCKET);
        const path = `${Date.now()}-${safeFileName(fileName)}`;

        const { error } = await storage.upload(path, buffer, {
            contentType: mimeType,
            upsert: false,
        });
        if (error) throw error;

        const { data: { publicUrl } } = storage.getPublicUrl(path);

        return NextResponse.json({ imageUrl: publicUrl });
    } catch (error: unknown) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
    }
}
