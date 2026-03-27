'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, getClaims } from '@/lib/api';
import { claimStatusLabel, claimStatusTone, formatNgn } from '@/lib/claim-ui';
import type { ClaimStatusApi } from '@/lib/auth-types';

type Row = {
  id: string;
  memberId: string;
  associationId: string;
  hospitalName: string;
  amount: string;
  status: ClaimStatusApi;
  createdAt: string;
};

const PAGE_SIZE = 4;

export const ClinicClaimsManagementTable = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClaimStatusApi>('all');
  const [associationFilter, setAssociationFilter] = useState<'all' | string>('all');
  const [page, setPage] = useState(1);

  const claimsQuery = useQuery({
    queryKey: ['claims'],
    queryFn: getClaims,
  });

  const rows = useMemo<Row[]>(() => {
    const data = claimsQuery.data ?? [];
    const mappedRows = data.map((c) => ({
      id: c.id,
      memberId: c.memberId,
      associationId: c.associationId,
      hospitalName: c.hospitalName,
      amount: formatNgn(c.billAmount),
      status: c.status as ClaimStatusApi,
      createdAt: new Date(c.createdAt).toLocaleString(),
    }));
    return mappedRows;
  }, [claimsQuery.data]);

  const associations = useMemo(() => Array.from(new Set(rows.map((c) => c.associationId))), [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((claim) => {
      const searchMatch =
        q.length === 0 ||
        claim.id.toLowerCase().includes(q) ||
        claim.memberId.toLowerCase().includes(q) ||
        claim.associationId.toLowerCase().includes(q) ||
        claim.hospitalName.toLowerCase().includes(q);
      const statusMatch = statusFilter === 'all' || claim.status === statusFilter;
      const associationMatch =
        associationFilter === 'all' || claim.associationId === associationFilter;
      return searchMatch && statusMatch && associationMatch;
    });
  }, [search, statusFilter, associationFilter, rows]);

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
            placeholder="Search by claim, member, association or hospital"
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
        <select
          value={associationFilter}
          onChange={(e) => {
            setAssociationFilter(e.target.value);
            setPage(1);
          }}
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm"
        >
          <option value="all">All associations</option>
          {associations.map((association) => (
            <option key={association} value={association}>
              {association.slice(0, 8)}…
            </option>
          ))}
        </select>
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
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2">Claim ID</th>
                  <th className="py-2">Member ID</th>
                  <th className="py-2">Association</th>
                  <th className="py-2">Hospital</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Status</th>
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
                      <td className="font-mono text-xs">{claim.memberId.slice(0, 8)}…</td>
                      <td className="font-mono text-xs">{claim.associationId.slice(0, 8)}…</td>
                      <td>{claim.hospitalName}</td>
                      <td>{claim.amount}</td>
                      <td>{claim.createdAt}</td>
                      <td>
                        <StatusBadge
                          label={claimStatusLabel(claim.status)}
                          tone={claimStatusTone(claim.status)}
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
        </>
      )}
    </div>
  );
};
