import { UserPlus, Users } from 'lucide-react';

import { EnrollMembersSection } from '@/components/association/enroll-members-section';
import { MemberManagementTable } from '@/components/association/member-management-table';
import { SectionCard } from '@/components/section-card';

type MembersPageProps = {
  params: Promise<{ id: string }>;
};

export default async function MembersPage({ params }: MembersPageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <SectionCard
        icon={UserPlus}
        title="Enroll members"
        description="Add one by one or bulk upload CSV (name, phone, BVN)."
      >
        <EnrollMembersSection associationId={id} />
      </SectionCard>

      <SectionCard
        icon={Users}
        title="Member list"
        description="Search, filter, paginate and inspect full member + wallet details."
      >
        <MemberManagementTable associationId={id} />
      </SectionCard>
    </div>
  );
}
