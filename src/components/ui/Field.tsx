'use client';

import {
    forwardRef,
    useId,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
} from 'react';

interface FieldChrome {
    label: string;
    hint?: string;
    error?: string;
    className?: string;
}

const CONTROL =
    'w-full rounded-xl border bg-white px-4 py-2.5 text-ink placeholder:text-muted/70 focus:border-primary disabled:bg-rose-faint';

function useFieldIds(explicitId: string | undefined, hint?: string, error?: string) {
    const generated = useId();
    const id = explicitId ?? generated;
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
    return { id, hintId, errorId, describedBy };
}

function Chrome({
    id,
    label,
    hint,
    error,
    hintId,
    errorId,
    className,
    children,
}: FieldChrome & { id: string; hintId?: string; errorId?: string; children: ReactNode }) {
    return (
        <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
            <label htmlFor={id} className="text-sm font-semibold text-ink">
                {label}
            </label>
            {children}
            {hint && !error && (
                <p id={hintId} className="text-xs text-muted">
                    {hint}
                </p>
            )}
            {error && (
                <p id={errorId} className="text-xs font-medium text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}

type InputProps = FieldChrome & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    { label, hint, error, className, id: explicitId, ...rest },
    ref
) {
    const { id, hintId, errorId, describedBy } = useFieldIds(explicitId, hint, error);
    return (
        <Chrome
            id={id}
            label={label}
            hint={hint}
            error={error}
            hintId={hintId}
            errorId={errorId}
            className={className}
        >
            <input
                ref={ref}
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={`${CONTROL} ${error ? 'border-danger' : 'border-rose/60'}`}
                {...rest}
            />
        </Chrome>
    );
});

type SelectProps = FieldChrome &
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
        options: ReadonlyArray<{ value: string | number; label: string }>;
        placeholder?: string;
    };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
    { label, hint, error, className, id: explicitId, options, placeholder, ...rest },
    ref
) {
    const { id, hintId, errorId, describedBy } = useFieldIds(explicitId, hint, error);
    return (
        <Chrome
            id={id}
            label={label}
            hint={hint}
            error={error}
            hintId={hintId}
            errorId={errorId}
            className={className}
        >
            <select
                ref={ref}
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className={`${CONTROL} ${error ? 'border-danger' : 'border-rose/60'}`}
                {...rest}
            >
                {placeholder !== undefined && <option value="">{placeholder}</option>}
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </Chrome>
    );
});
