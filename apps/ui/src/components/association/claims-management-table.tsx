'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';

type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'paid';
type ClaimType = 'outpatient' | 'major';

type ClaimRow = {
  id: string;
  member: string;
  clinic: string;
  amount: string;
  type: ClaimType;
  status: ClaimStatus;
  createdAt: string;
};

const CLAIMS: ClaimRow[] = [
  {
    id: 'CLM-1822',
    member: 'Kemi Adesina',
    clinic: 'HealthPoint Clinic',
    amount: 'N 90,000',
    type: 'major',
    status: 'pending',
    createdAt: '2026-03-20',
  },
  {
    id: 'CLM-1819',
    member: 'Amaka Obi',
    clinic: 'Goodlife Hospital',
    amount: 'N 40,000',
    type: 'outpatient',
    status: 'approved',
    createdAt: '2026-03-18',
  },
  {
    id: 'CLM-1816',
    member: 'Segun Musa',
    clinic: 'HealthPoint Clinic',
    amount: 'N 15,000',
    type: 'outpatient',
    status: 'paid',
    createdAt: '2026-03-17',
  },
  {
    id: 'CLM-1813',
    member: 'Binta Yusuf',
    clinic: 'PrimeCare',
    amount: 'N 120,000',
    type: 'major',
    status: 'rejected',
    createdAt: '2026-03-15',
  },
  {
    id: 'CLM-1809',
    member: 'Tunde Lawal',
    clinic: 'Goodlife Hospital',
    amount: 'N 28,000',
    type: 'outpatient',
    status: 'pending',
    createdAt: '2026-03-13',
  },
  {
    id: 'CLM-1801',
    member: 'Ngozi Eze',
    clinic: 'PrimeCare',
    amount: 'N 65,000',
    type: 'major',
    status: 'approved',
    createdAt: '2026-03-10',
  },
];

const PAGE_SIZE = 4;

type ClaimsManagementTableProps = {
  associationId: string;
};

export function ClaimsManagementTable({ associationId }: ClaimsManagementTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ClaimStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | ClaimType>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CLAIMS.filter((claim) => {
      const searchMatch =
        q.length === 0 ||
        claim.id.toLowerCase().includes(q) ||
        claim.member.toLowerCase().includes(q) ||
        claim.clinic.toLowerCase().includes(q);
      const statusMatch = statusFilter === 'all' || claim.status === statusFilter;
      const typeMatch = typeFilter === 'all' || claim.type === typeFilter;
      return searchMatch && statusMatch && typeMatch;
    });
  }, [search, statusFilter, typeFilter]);

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
            placeholder="Search by claim ID, member or clinic"
            className="w-full rounded-lg border border-white/15 bg-slate-900 py-2 pl-9 pr-3 text-sm"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as 'all' | ClaimStatus);
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
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as 'all' | ClaimType);
            setPage(1);
          }}
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm capitalize"
        >
          <option value="all">All claim types</option>
          <option value="outpatient">Outpatient</option>
          <option value="major">Major</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2">Claim</th>
              <th className="py-2">Member</th>
              <th className="py-2">Clinic</th>
              <th className="py-2">Type</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Created</th>
              <th className="py-2">Status</th>
              <th className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr className="border-t border-white/10">
                <td colSpan={8} className="py-6 text-center text-slate-400">
                  No claims match your search/filters.
                </td>
              </tr>
            ) : (
              paged.map((claim) => (
                <tr key={claim.id} className="border-t border-white/10">
                  <td className="py-3 font-medium text-white">{claim.id}</td>
                  <td>{claim.member}</td>
                  <td>{claim.clinic}</td>
                  <td className="capitalize">{claim.type}</td>
                  <td>{claim.amount}</td>
                  <td>{claim.createdAt}</td>
                  <td>
                    <StatusBadge
                      label={claim.status}
                      tone={
                        claim.status === 'pending'
                          ? 'yellow'
                          : claim.status === 'paid'
                            ? 'green'
                            : claim.status === 'approved'
                              ? 'blue'
                              : 'red'
                      }
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
