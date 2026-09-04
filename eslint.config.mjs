import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
    { ignores: ['.next/**', 'node_modules/**', 'uploads/**', 'next-env.d.ts'] },
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        rules: {
            // User-facing feedback goes through the Toast/Modal components, never browser dialogs.
            'no-restricted-globals': ['error', 'alert', 'confirm', 'prompt'],
        },
    },
];

export default config;
