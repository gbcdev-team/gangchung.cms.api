'use client';

import { useRouter } from 'next/navigation';
import MemberForm from '@/components/admin/MemberForm';
import { createMemberAction } from '../actions';
import type { Member, MemberFormInput } from '@/types/member';

export default function NewMemberForm({ allMembers }: { allMembers: Member[] }) {
  const router = useRouter();

  const handleSubmit = async (input: MemberFormInput) => {
    await createMemberAction(input);
    router.push('/members');
  };

  return <MemberForm allMembers={allMembers} onSubmit={handleSubmit} submitLabel="등록" />;
}
