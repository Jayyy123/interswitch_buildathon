'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, getAssociationTransactions } from '@/lib/api';
import { formatNgn } from '@/lib/claim-ui';

const PAGE_SIZE = 4;

type TxStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
type TxSource = 'DIRECT_DEBIT' | 'CASH';

type TransactionsManagementTableProps = {
  associationId: string;
};

export const TransactionsManagementTable = ({
  associationId,
}: TransactionsManagementTableProps) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TxStatus>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | TxSource>('all');
  const [page, setPage] = useState(1);

  const transactionsQuery = useQuery({
    queryKey: ['association-transactions', associationId, page, sourceFilter],
    queryFn: () =>
      getAssociationTransactions(associationId, {
        page,
        limit: PAGE_SIZE,
        source: sourceFilter === 'all' ? undefined : sourceFilter,
      }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const rows = transactionsQuery.data?.data ?? [];
    return rows.filter((row) => {
      const searchMatch =
        q.length === 0 ||
        row.id.toLowerCase().includes(q) ||
        row.member.name.toLowerCase().includes(q) ||
        new Date(row.week).toLocaleDateString().toLowerCase().includes(q);
      const statusMatch = statusFilter === 'all' || row.status === statusFilter;
      const sourceMatch = sourceFilter === 'all' || row.source === sourceFilter;
      return searchMatch && statusMatch && sourceMatch;
    });
  }, [search, statusFilter, sourceFilter, transactionsQuery.data]);

  const totalPages = Math.max(1, Math.ceil((transactionsQuery.data?.total ?? 0) / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered;

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
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
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
          <option value="DIRECT_DEBIT">Auto debit</option>
          <option value="CASH">Cash</option>
        </select>
      </div>
      {transactionsQuery.isError ? (
        <p className="text-sm text-rose-300">
          {transactionsQuery.error instanceof ApiError
            ? transactionsQuery.error.message
            : 'Could not load transactions.'}
        </p>
      ) : null}

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
            {transactionsQuery.isPending ? (
              <tr className="border-t border-white/10">
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  Loading transactions...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr className="border-t border-white/10">
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  No transactions match your search/filters.
                </td>
              </tr>
            ) : (
              paged.map((row) => (
                <tr key={row.id} className="border-t border-white/10">
                  <td className="py-3 font-medium text-white">{row.id.slice(0, 8)}...</td>
                  <td className="capitalize">
                    {row.source === 'DIRECT_DEBIT' ? 'Auto debit' : 'Cash'}
                  </td>
                  <td>{row.member.name}</td>
                  <td>{new Date(row.week).toLocaleDateString()}</td>
                  <td>{formatNgn(row.amount)}</td>
                  <td>{new Date(row.createdAt).toLocaleString()}</td>
                  <td>
                    <StatusBadge
                      label={row.status.toLowerCase()}
                      tone={
                        row.status === 'SUCCESS'
                          ? 'green'
                          : row.status === 'PENDING'
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
          {(safePage - 1) * PAGE_SIZE + paged.length} of {transactionsQuery.data?.total ?? 0}
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
};
