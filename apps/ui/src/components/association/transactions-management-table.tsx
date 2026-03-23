'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';

type TxStatus = 'success' | 'failed' | 'cash' | 'pending';
type TxSource = 'auto_debit' | 'cash' | 'manual';

type TxRow = {
  ref: string;
  source: TxSource;
  member: string;
  weekOf: string;
  amount: string;
  status: TxStatus;
  processedAt: string;
};

const TRANSACTIONS: TxRow[] = [
  {
    ref: 'TX-82112',
    source: 'auto_debit',
    member: 'Kemi Adesina',
    weekOf: '2026-W10',
    amount: 'N 6,000',
    status: 'success',
    processedAt: '2026-03-20 09:13',
  },
  {
    ref: 'TX-82110',
    source: 'cash',
    member: 'Tunde Lawal',
    weekOf: '2026-W10',
    amount: 'N 6,000',
    status: 'cash',
    processedAt: '2026-03-20 11:42',
  },
  {
    ref: 'TX-82105',
    source: 'auto_debit',
    member: 'Amaka Obi',
    weekOf: '2026-W10',
    amount: 'N 6,000',
    status: 'failed',
    processedAt: '2026-03-20 08:57',
  },
  {
    ref: 'TX-82098',
    source: 'manual',
    member: 'Binta Yusuf',
    weekOf: '2026-W09',
    amount: 'N 6,000',
    status: 'pending',
    processedAt: '2026-03-18 17:26',
  },
  {
    ref: 'TX-82095',
    source: 'auto_debit',
    member: 'Segun Musa',
    weekOf: '2026-W09',
    amount: 'N 6,000',
    status: 'success',
    processedAt: '2026-03-17 10:06',
  },
];

const PAGE_SIZE = 4;

export function TransactionsManagementTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TxStatus>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | TxSource>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return TRANSACTIONS.filter((row) => {
      const searchMatch =
        q.length === 0 ||
        row.ref.toLowerCase().includes(q) ||
        row.member.toLowerCase().includes(q) ||
        row.weekOf.toLowerCase().includes(q);
      const statusMatch = statusFilter === 'all' || row.status === statusFilter;
      const sourceMatch = sourceFilter === 'all' || row.source === sourceFilter;
      return searchMatch && statusMatch && sourceMatch;
    });
  }, [search, statusFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by reference, member or week"
            className="w-full rounded-lg border border-white/15 bg-slate-900 py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | TxStatus);
            setPage(1);
          }}
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm capitalize"
        >
          <option value="all">All status</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="cash">Cash</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value as 'all' | TxSource);
            setPage(1);
          }}
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm capitalize"
        >
          <option value="all">All sources</option>
          <option value="auto_debit">Auto debit</option>
          <option value="cash">Cash</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2">Reference</th>
              <th className="py-2">Source</th>
              <th className="py-2">Member</th>
              <th className="py-2">Week Of</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Processed</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr className="border-t border-white/10">
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  No transactions match your search/filters.
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr key={row.ref} className="border-t border-white/10">
                  <td className="py-3 font-medium text-white">{row.ref}</td>
                  <td className="capitalize">{row.source.replace('_', ' ')}</td>
                  <td>{row.member}</td>
                  <td>{row.weekOf}</td>
                  <td>{row.amount}</td>
                  <td>{row.processedAt}</td>
                  <td>
                    <StatusBadge
                      label={row.status}
                      tone={
                        row.status === 'success'
                          ? 'green'
                          : row.status === 'cash'
                            ? 'blue'
                            : row.status === 'pending'
                              ? 'yellow'
                              : 'red'
                      }
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs text-slate-300">
        <p>
          Showing {paged.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-
          {(safePage - 1) * PAGE_SIZE + paged.length} of {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <ChevronLeft className="size-4" />
            Prev
          </button>
          <span>
            Page {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
