'use client';

import { useId, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { api, errorMessage } from '@/lib/client/api';
import { Spinner } from './ui/Spinner';

export function PhotoUpload({
    value,
    onChange,
    error,
    label = 'Photo',
}: {
    value: string;
    onChange: (imageUrl: string) => void;
    error?: string;
    label?: string;
}) {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [uploadError, setUploadError] = useState('');

    const handleFile = async (file: File | undefined) => {
        if (!file) return;
        setUploadError('');
        setBusy(true);
        try {
            const { imageUrl } = await api.upload(file);
            onChange(imageUrl);
        } catch (err) {
            setUploadError(errorMessage(err));
        } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const message = uploadError || error;

    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-ink">{label}</span>
            <input
                ref={inputRef}
                id={id}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                className="sr-only"
                onChange={(e) => handleFile(e.target.files?.[0])}
                aria-describedby={message ? `${id}-error` : undefined}
            />
            {value ? (
                <div className="relative overflow-hidden rounded-xl border border-rose/60 bg-rose-faint">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={value} alt="Puzzle preview" className="h-44 w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-between bg-white/90 px-3 py-2 text-sm">
                        <label
                            htmlFor={id}
                            className="cursor-pointer font-semibold text-primary hover:underline"
                        >
                            Replace photo
                        </label>
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="flex items-center gap-1 text-muted hover:text-danger"
                        >
                            <X className="h-4 w-4" aria-hidden="true" /> Remove
                        </button>
                    </div>
                </div>
            ) : (
                <label
                    htmlFor={id}
                    className={`flex h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-white text-sm text-muted hover:border-primary hover:text-primary ${
                        message ? 'border-danger' : 'border-rose/60'
                    }`}
                >
                    {busy ? (
                        <>
                            <Spinner className="h-6 w-6 text-primary" label="Uploading" />
                            Uploading…
                        </>
                    ) : (
                        <>
                            <Camera className="h-7 w-7" aria-hidden="true" />
                            <span>
                                <span className="font-semibold text-primary">Choose a photo</span> of the
                                puzzle
                            </span>
                            <span className="text-xs">JPEG, PNG, WebP, GIF, or HEIC · up to 10 MB</span>
                        </>
                    )}
                </label>
            )}
            {message && (
                <p id={`${id}-error`} className="text-xs font-medium text-danger">
                    {message}
                </p>
            )}
        </div>
    );
}
