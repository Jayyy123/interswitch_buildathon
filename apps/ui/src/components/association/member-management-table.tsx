'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { MEMBERS, type MemberStatus, type PaymentMethod } from '@/data/members';
import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';

const PAGE_SIZE = 4;

type MemberManagementTableProps = {
  associationId: string;
};

export const MemberManagementTable = ({ associationId }: MemberManagementTableProps) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | MemberStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentMethod>('all');
  const [page, setPage] = useState(1);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MEMBERS.filter((member) => {
      const searchMatch =
        q.length === 0 ||
        member.fullName.toLowerCase().includes(q) ||
        member.id.toLowerCase().includes(q) ||
        member.phone.toLowerCase().includes(q);
      const statusMatch = statusFilter === 'all' || member.status === statusFilter;
      const paymentMatch = paymentFilter === 'all' || member.paymentMethod === paymentFilter;
      return searchMatch && statusMatch && paymentMatch;
    });
  }, [search, statusFilter, paymentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageMembers = filteredMembers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const onPageChange = (nextPage: number) => setPage(Math.min(totalPages, Math.max(1, nextPage)));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search by name, member ID, or phone"
            className="w-full rounded-lg border border-white/15 bg-slate-900 py-2 pl-9 pr-3 text-sm"
          />
        </label>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as 'all' | MemberStatus);
            setPage(1);
          }}
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm capitalize"
        >
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="removed">Removed</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(event) => {
            setPaymentFilter(event.target.value as 'all' | PaymentMethod);
            setPage(1);
          }}
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm capitalize"
        >
          <option value="all">All payment methods</option>
          <option value="wallet">Wallet</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2">Member</th>
              <th className="py-2">Phone</th>
              <th className="py-2">Status</th>
              <th className="py-2">Payment</th>
              <th className="py-2">Contrib. streak</th>
              <th className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageMembers.length === 0 ? (
              <tr className="border-t border-white/10">
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  No members match your search/filters.
                </td>
              </tr>
            ) : (
              pageMembers.map((member) => (
                <tr key={member.id} className="border-t border-white/10">
                  <td className="py-3">
                    <p className="font-medium text-white">{member.fullName}</p>
                    <p className="text-xs text-slate-400">{member.id}</p>
                  </td>
                  <td>{member.phone}</td>
                  <td>
                    <StatusBadge
                      label={member.status}
                      tone={
                        member.status === 'active'
                          ? 'green'
                          : member.status === 'paused'
                            ? 'yellow'
                            : 'red'
                      }
                    />
                  </td>
                  <td className="capitalize">{member.paymentMethod}</td>
                  <td>{member.contributionStreak}</td>
                  <td className="text-right">
                    <Link
                      href={`/association/${associationId}/members/${member.id}`}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      View details
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
          Showing {pageMembers.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-
          {(safePage - 1) * PAGE_SIZE + pageMembers.length} of {filteredMembers.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'justify-center',
            })}
          >
            <ChevronLeft className="size-4" />
            Prev
          </button>
          <span className="text-slate-300">
            Page {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'justify-center',
            })}
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
