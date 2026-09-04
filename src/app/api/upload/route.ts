import convert from 'heic-convert';
import { handle, ok, validationError } from '@/lib/api';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { EXTENSION_FOR, saveUpload, sniffImageType } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const POST = handle('upload', async (request) => {
    rateLimit(`upload:${clientIp(request)}`, 30, 60 * 60 * 1000);

    const formData = await request.formData().catch(() => null);
    const file = formData?.get('puzzlePhoto');
    if (!(file instanceof File)) throw validationError('Please choose a photo.', 'puzzlePhoto');
    if (file.size > MAX_FILE_SIZE)
        throw validationError('Photo is too large. Maximum size is 10 MB.', 'puzzlePhoto');

    let buffer: Buffer = Buffer.from(await file.arrayBuffer());
    // The real type comes from the bytes, never from the filename or the client-supplied MIME type.
    let type = sniffImageType(buffer);
    if (!type) throw validationError('Please upload a JPEG, PNG, WebP, GIF, or HEIC photo.', 'puzzlePhoto');

    if (type === 'image/heic') {
        try {
            const raw = buffer.buffer.slice(
                buffer.byteOffset,
                buffer.byteOffset + buffer.byteLength
            ) as ArrayBuffer;
            const converted = await convert({ buffer: raw, format: 'JPEG', quality: 0.8 });
            buffer = Buffer.from(new Uint8Array(converted));
            type = 'image/jpeg';
        } catch (error) {
            console.error('[upload] HEIC conversion failed', error);
            throw validationError(
                'We could not read that HEIC photo. Please try a JPEG or PNG.',
                'puzzlePhoto'
            );
        }
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    const imageUrl = await saveUpload(buffer, `${baseName}${EXTENSION_FOR[type]}`);
    return ok({ imageUrl }, 201);
});
