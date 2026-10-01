'use client';

import { useRouter } from 'next/navigation';
import MemberForm from '@/components/admin/MemberForm';
import { updateMemberAction } from '../../actions';
import type { Member, MemberFormInput } from '@/types/member';

export default function EditMemberForm({
  member,
  allMembers,
}: {
  member: Member;
  allMembers: Member[];
}) {
  const router = useRouter();

  const handleSubmit = async (input: MemberFormInput) => {
    await updateMemberAction(member.id, input);
    router.push('/members');
  };

  return (
    <MemberForm
      initialValues={{
        name: member.name,
        phone: member.phone ?? '',
        gender: member.gender ?? '',
        age_group: member.age_group ?? '',
        birth_date: member.birth_date ?? '',
        position: member.position,
        parent_id: member.parent_id,
      }}
      currentMemberId={member.id}
      allMembers={allMembers}
      onSubmit={handleSubmit}
      submitLabel="수정 완료"
    />
  );
}
