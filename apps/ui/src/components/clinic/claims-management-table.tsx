'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, getClinicClaims, type ClinicClaim } from '@/lib/api';
import { claimStatusLabel, claimStatusTone, formatNgn } from '@/lib/claim-ui';
import type { ClaimStatusApi } from '@/lib/auth-types';

type Row = {
  id: string;
  memberName: string;
  associationName: string;
  hospitalName: string;
  amount: string;
  approvedAmount: string;
  status: ClaimStatusApi;
  createdAt: string;
};

const PAGE_SIZE = 4;

export const ClinicClaimsManagementTable = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClaimStatusApi>('all');
  const [page, setPage] = useState(1);

  const claimsQuery = useQuery({
    queryKey: ['clinic-claims'],
    queryFn: getClinicClaims,
  });

  const rows = useMemo<Row[]>(() => {
    const data = claimsQuery.data ?? [];
    return data.map((c: ClinicClaim) => ({
      id: c.id,
      memberName: c.member?.name ?? c.memberId.slice(0, 8),
      associationName: c.association?.name ?? c.associationId.slice(0, 8),
      hospitalName: c.hospitalName,
      amount: formatNgn(c.billAmount),
      approvedAmount: c.approvedAmount != null ? formatNgn(c.approvedAmount) : '—',
      status: c.status as ClaimStatusApi,
      createdAt: new Date(c.createdAt).toLocaleString(),
    }));
  }, [claimsQuery.data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((claim) => {
      const searchMatch =
        q.length === 0 ||
        claim.id.toLowerCase().includes(q) ||
        claim.memberName.toLowerCase().includes(q) ||
        claim.associationName.toLowerCase().includes(q) ||
        claim.hospitalName.toLowerCase().includes(q);
      const statusMatch = statusFilter === 'all' || claim.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [search, statusFilter, rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by member, association or hospital"
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
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="py-2">Member</th>
                  <th className="py-2">Association</th>
                  <th className="py-2">Bill</th>
                  <th className="py-2">Approved</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr className="border-t border-white/10">
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      {rows.length === 0
                        ? 'No claims yet. They will appear here after your first submission.'
                        : 'No claims match your search/filters.'}
                    </td>
                  </tr>
                ) : (
                  paged.map((claim) => (
                    <tr key={claim.id} className="border-t border-white/10">
                      <td className="py-3 font-medium text-white">{claim.memberName}</td>
                      <td className="text-slate-300">{claim.associationName}</td>
                      <td>{claim.amount}</td>
                      <td className="font-semibold text-emerald-300">{claim.approvedAmount}</td>
                      <td className="text-slate-400">{claim.createdAt}</td>
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
