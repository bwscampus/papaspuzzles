import type { ReactNode } from 'react';

export interface Column<T> {
    key: string;
    header: string;
    render: (row: T) => ReactNode;
    className?: string;
}

export function DataTable<T extends { id: string }>({
    columns,
    rows,
    emptyText = 'Nothing here.',
}: {
    columns: Column<T>[];
    rows: T[];
    emptyText?: string;
}) {
    return (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
            <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-rose-faint text-xs font-semibold uppercase tracking-wide text-muted">
                    <tr>
                        {columns.map((c) => (
                            <th key={c.key} scope="col" className={`px-4 py-3 ${c.className ?? ''}`}>
                                {c.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-rose/30">
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                                {emptyText}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <tr key={row.id} className="align-top">
                                {columns.map((c) => (
                                    <td key={c.key} className={`px-4 py-3 ${c.className ?? ''}`}>
                                        {c.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
