export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
    return (
        <ol className="flex items-center gap-3" aria-label="Progress">
            {steps.map((label, i) => {
                const n = i + 1;
                const state = n < current ? 'done' : n === current ? 'current' : 'todo';
                return (
                    <li
                        key={label}
                        className="flex items-center gap-3"
                        aria-current={state === 'current' ? 'step' : undefined}
                    >
                        <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full font-display text-sm font-bold ${
                                state === 'todo' ? 'bg-rose-tint text-muted' : 'bg-primary text-white'
                            }`}
                        >
                            {n}
                        </span>
                        <span
                            className={`hidden text-sm sm:inline ${state === 'current' ? 'font-semibold text-ink' : 'text-muted'}`}
                        >
                            {label}
                        </span>
                        {i < steps.length - 1 && (
                            <span aria-hidden="true" className="h-0.5 w-6 rounded bg-rose/60 sm:w-10" />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}
