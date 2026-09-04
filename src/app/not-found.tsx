import { Button } from '@/components/ui/Button';

export default function NotFound() {
    return (
        <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
            <h1 className="text-4xl">Missing piece</h1>
            <p className="mt-3 text-muted">We could not find that page.</p>
            <Button href="/" className="mt-8">
                Back to home
            </Button>
        </main>
    );
}
