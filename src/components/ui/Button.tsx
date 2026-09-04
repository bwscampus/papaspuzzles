import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
    primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
    secondary: 'bg-accent text-ink hover:bg-accent/80 shadow-sm',
    outline: 'border-2 border-primary text-primary hover:bg-rose-faint',
    ghost: 'text-primary hover:bg-rose-faint',
    danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
};

const SIZES: Record<Size, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
};

interface BaseProps {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    className?: string;
    children: ReactNode;
}

type ButtonProps = BaseProps &
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { href?: undefined };
type LinkProps = BaseProps & { href: string; onClick?: never; disabled?: boolean; type?: never };

export function Button(props: ButtonProps | LinkProps) {
    const { variant = 'primary', size = 'md', loading = false, className = '', children } = props;
    const classes = `inline-flex items-center justify-center gap-2 rounded-full font-display font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;

    if ('href' in props && props.href !== undefined) {
        const { href, disabled } = props;
        if (disabled) {
            return (
                <span aria-disabled="true" className={`${classes} opacity-60`}>
                    {children}
                </span>
            );
        }
        return (
            <Link href={href} className={classes}>
                {children}
            </Link>
        );
    }

    const { type = 'button', disabled, ...rest } = props as ButtonProps;
    return (
        <button
            type={type}
            className={classes}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...rest}
        >
            {loading && <Spinner className="h-4 w-4" />}
            {children}
        </button>
    );
}
