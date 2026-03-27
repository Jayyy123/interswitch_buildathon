'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';
import { buttonVariants } from '@/components/ui/button-variants';
import { ApiError, getAssociationMembers, retryAssociationMemberWallet } from '@/lib/api';
import type { AssociationMemberStatus } from '@/lib/auth-types';

const PAGE_SIZE = 4;

type MemberManagementTableProps = {
  associationId: string;
};

export const MemberManagementTable = ({ associationId }: MemberManagementTableProps) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AssociationMemberStatus>('all');
  const [page, setPage] = useState(1);

  const membersQuery = useQuery({
    queryKey: ['association-members', associationId, page, statusFilter, search],
    queryFn: () =>
      getAssociationMembers(associationId, {
        page,
        limit: PAGE_SIZE,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
      }),
  });

  const total = membersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageMembers = membersQuery.data?.data ?? [];

  const retryWalletMutation = useMutation({
    mutationFn: (memberId: string) => retryAssociationMemberWallet(associationId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['association-members', associationId] });
    },
  });

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
            setStatusFilter(event.target.value as 'all' | AssociationMemberStatus);
            setPage(1);
          }}
          className="w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-sm capitalize"
        >
          <option value="all">All status</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="FLAGGED">Flagged</option>
          <option value="INCOMPLETE">Incomplete</option>
        </select>
      </div>

      {membersQuery.isError ? (
        <p className="text-sm text-rose-300">
          {membersQuery.error instanceof ApiError
            ? membersQuery.error.message
            : 'Could not load members.'}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-2">Member</th>
              <th className="py-2">Phone</th>
              <th className="py-2">Status</th>
              <th className="py-2">Wallet</th>
              <th className="py-2">Contrib. streak</th>
              <th className="py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {membersQuery.isPending ? (
              <tr className="border-t border-white/10">
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  Loading members...
                </td>
              </tr>
            ) : pageMembers.length === 0 ? (
              <tr className="border-t border-white/10">
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  No members match your search/filters.
                </td>
              </tr>
            ) : (
              pageMembers.map((member) => (
                <tr key={member.id} className="border-t border-white/10">
                  <td className="py-3">
                    <p className="font-medium text-white">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.id}</p>
                  </td>
                  <td>{member.phone}</td>
                  <td>
                    <StatusBadge
                      label={member.status}
                      tone={
                        member.status === 'ACTIVE'
                          ? 'green'
                          : member.status === 'PAUSED'
                            ? 'yellow'
                            : 'red'
                      }
                    />
                  </td>
                  <td>
                    <StatusBadge
                      label={member.walletStatus}
                      tone={
                        member.walletStatus === 'SUCCESS'
                          ? 'green'
                          : member.walletStatus === 'PENDING'
                            ? 'yellow'
                            : 'red'
                      }
                    />
                  </td>
                  <td>{Math.max(0, 3 - member.consecutiveMissedPayments)}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/association/${associationId}/members/${member.id}`}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        View details
                      </Link>
                      {member.walletStatus === 'FAILED' ? (
                        <button
                          type="button"
                          className={buttonVariants({ size: 'sm' })}
                          disabled={retryWalletMutation.isPending}
                          onClick={() => retryWalletMutation.mutate(member.id)}
                        >
                          Retry wallet
                        </button>
                      ) : null}
                    </div>
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
          {(safePage - 1) * PAGE_SIZE + pageMembers.length} of {total}
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
