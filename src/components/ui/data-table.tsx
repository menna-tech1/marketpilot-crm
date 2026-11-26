"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  searchText,
  searchPlaceholder = "Search…",
  toolbar,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  emptyAction,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchText || !query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter((row) => searchText(row).toLowerCase().includes(q));
  }, [rows, query, searchText]);

  return (
    <div className="card-base overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {searchText ? (
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="input-base h-9 pl-9"
            />
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {filtered.length} of {rows.length}
          </span>
          {toolbar}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-700">
            {rows.length === 0 ? emptyTitle : "No matching records"}
          </p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {rows.length === 0
              ? emptyDescription
              : "Try a different search term."}
          </p>
          {rows.length === 0 && emptyAction ? <div className="mt-4">{emptyAction}</div> : null}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500",
                      col.headerClassName,
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <tr key={rowKey(row)} className="transition hover:bg-slate-50/70">
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("whitespace-nowrap px-4 py-3 text-slate-700", col.className)}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
