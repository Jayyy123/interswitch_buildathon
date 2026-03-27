'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, getAssociationClaims } from '@/lib/api';
import { claimStatusLabel, claimStatusTone, formatNgn } from '@/lib/claim-ui';
import type { ClaimStatusApi } from '@/lib/auth-types';

type Row = {
  id: string;
  memberId: string;
  memberName: string;
  hospitalName: string;
  amount: string;
  status: ClaimStatusApi;
  createdAt: string;
};

const PAGE_SIZE = 4;

type ClaimsManagementTableProps = {
  associationId: string;
};

export const ClaimsManagementTable = ({ associationId }: ClaimsManagementTableProps) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClaimStatusApi>('all');
  const [page, setPage] = useState(1);

  const claimsQuery = useQuery({
    queryKey: ['association-claims', associationId, page, statusFilter],
    queryFn: () =>
      getAssociationClaims(associationId, {
        page,
        limit: PAGE_SIZE,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  const rows = useMemo<Row[]>(() => {
    const data = claimsQuery.data?.data ?? [];
    const mappedRows = data.map((c) => ({
      id: c.id,
      memberId: c.member.id,
      memberName: c.member.name,
      hospitalName: c.hospitalName,
      amount: formatNgn(c.billAmount),
      status: c.status as ClaimStatusApi,
      createdAt: new Date(c.createdAt).toLocaleDateString(),
    }));
    return mappedRows;
  }, [claimsQuery.data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((claim) => {
      const searchMatch =
        q.length === 0 ||
        claim.id.toLowerCase().includes(q) ||
        claim.memberId.toLowerCase().includes(q) ||
        claim.hospitalName.toLowerCase().includes(q);
      const statusMatch = statusFilter === 'all' || claim.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [search, statusFilter, rows]);

  const totalPages = Math.max(1, Math.ceil((claimsQuery.data?.total ?? 0) / PAGE_SIZE));
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
            placeholder="Search by claim ID, member ID or hospital"
            className="w-full rounded-lg border border-white/15 bg-slate-900 py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | ClaimStatusApi);
            setPage(1);
          }}
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm capitalize"
        >
          <option value="all">All status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
        </select>
        <div className="flex items-center rounded-lg border border-white/15 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
          Portal scope: {associationId.slice(0, 8)}…
        </div>
      </div>

      {claimsQuery.isPending ? (
        <p className="text-sm text-slate-400">Loading claims…</p>
      ) : claimsQuery.isError ? (
        <p className="text-sm text-rose-300">
          {claimsQuery.error instanceof ApiError
            ? claimsQuery.error.message
            : 'Could not load claims.'}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2">Claim</th>
                  <th className="py-2">Member</th>
                  <th className="py-2">Hospital</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr className="border-t border-white/10">
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      {rows.length === 0
                        ? 'No claims yet. They will appear here when linked to your member account.'
                        : 'No claims match your search/filters.'}
                    </td>
                  </tr>
                ) : (
                  paged.map((claim) => (
                    <tr key={claim.id} className="border-t border-white/10">
                      <td className="py-3 font-medium text-white">{claim.id.slice(0, 8)}…</td>
                      <td className="text-xs">
                        <p className="font-medium text-white">{claim.memberName || '-'}</p>
                        <p className="font-mono text-slate-400">{claim.memberId.slice(0, 8)}...</p>
                      </td>
                      <td>{claim.hospitalName}</td>
                      <td>{claim.amount}</td>
                      <td>{claim.createdAt}</td>
                      <td>
                        <StatusBadge
                          label={claimStatusLabel(claim.status)}
                          tone={claimStatusTone(claim.status)}
                        />
                      </td>
                      <td className="text-right">
                        <Link
                          href={`/association/${associationId}/claims/${claim.id}`}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          Open
                        </Link>
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
              {(safePage - 1) * PAGE_SIZE + paged.length} of {claimsQuery.data?.total ?? 0}
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
        </>
      )}
    </div>
  );
};
