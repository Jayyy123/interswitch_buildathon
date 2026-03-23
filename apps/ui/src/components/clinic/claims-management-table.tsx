'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';

type ClinicClaimStatus = 'pending' | 'approved' | 'rejected' | 'paid';

type ClinicClaimRow = {
  id: string;
  memberId: string;
  association: string;
  amount: string;
  status: ClinicClaimStatus;
  createdAt: string;
};

const CLINIC_CLAIMS: ClinicClaimRow[] = [
  {
    id: 'CLM-1822',
    memberId: 'MEM-001',
    association: 'Alausa Traders',
    amount: 'N 90,000',
    status: 'pending',
    createdAt: '2026-03-20 09:45',
  },
  {
    id: 'CLM-1819',
    memberId: 'MEM-003',
    association: 'Alausa Traders',
    amount: 'N 40,000',
    status: 'approved',
    createdAt: '2026-03-19 13:10',
  },
  {
    id: 'CLM-1816',
    memberId: 'MEM-010',
    association: 'Mushin Market Women',
    amount: 'N 15,000',
    status: 'rejected',
    createdAt: '2026-03-18 11:30',
  },
  {
    id: 'CLM-1815',
    memberId: 'MEM-014',
    association: 'Mushin Market Women',
    amount: 'N 65,000',
    status: 'paid',
    createdAt: '2026-03-17 10:12',
  },
  {
    id: 'CLM-1812',
    memberId: 'MEM-017',
    association: 'Alausa Traders',
    amount: 'N 24,000',
    status: 'pending',
    createdAt: '2026-03-16 08:59',
  },
];

const PAGE_SIZE = 4;

export function ClinicClaimsManagementTable() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClinicClaimStatus>('all');
  const [associationFilter, setAssociationFilter] = useState<'all' | string>('all');
  const [page, setPage] = useState(1);

  const associations = useMemo(
    () => Array.from(new Set(CLINIC_CLAIMS.map((c) => c.association))),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CLINIC_CLAIMS.filter((claim) => {
      const searchMatch =
        q.length === 0 ||
        claim.id.toLowerCase().includes(q) ||
        claim.memberId.toLowerCase().includes(q) ||
        claim.association.toLowerCase().includes(q);
      const statusMatch = statusFilter === 'all' || claim.status === statusFilter;
      const associationMatch =
        associationFilter === 'all' || claim.association === associationFilter;
      return searchMatch && statusMatch && associationMatch;
    });
  }, [search, statusFilter, associationFilter]);

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
            placeholder="Search by claim ID, member ID or association"
            className="w-full rounded-lg border border-white/15 bg-slate-900 py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | ClinicClaimStatus);
            setPage(1);
          }}
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm capitalize"
        >
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
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
              {association}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2">Claim ID</th>
              <th className="py-2">Member ID</th>
              <th className="py-2">Association</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Created</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr className="border-t border-white/10">
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  No claims match your search/filters.
                </td>
              </tr>
            ) : (
              paged.map((claim) => (
                <tr key={claim.id} className="border-t border-white/10">
                  <td className="py-3 font-medium text-white">{claim.id}</td>
                  <td>{claim.memberId}</td>
                  <td>{claim.association}</td>
                  <td>{claim.amount}</td>
                  <td>{claim.createdAt}</td>
                  <td>
                    <StatusBadge
                      label={claim.status}
                      tone={
                        claim.status === 'approved' || claim.status === 'paid'
                          ? 'green'
                          : claim.status === 'pending'
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
