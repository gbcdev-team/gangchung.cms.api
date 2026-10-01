import { notFound } from 'next/navigation';
import { getAllMembers, getMemberByIdAdmin } from '@/libs/supabase/queries/members.admin';
import EditMemberForm from './EditMemberForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditMemberPage({ params }: Props) {
  const { id } = await params;
  const [member, allMembers] = await Promise.all([getMemberByIdAdmin(id), getAllMembers()]);

  if (!member) notFound();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">구성원 수정</h1>
        <p className="text-sm text-gray-400 mt-0.5">{member.name}</p>
      </div>
      <EditMemberForm member={member} allMembers={allMembers} />
    </div>
  );
}
