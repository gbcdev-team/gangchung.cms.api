'use server';

import {
  createMember,
  updateMember,
  deleteMember,
} from '@/libs/supabase/queries/members.admin';
import type { Member, MemberFormInput } from '@/types/member';

export async function createMemberAction(input: MemberFormInput): Promise<Member> {
  return createMember(input);
}

export async function updateMemberAction(id: string, input: MemberFormInput): Promise<Member> {
  return updateMember(id, input);
}

export async function deleteMemberAction(id: string): Promise<void> {
  return deleteMember(id);
}
