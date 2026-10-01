import NewMemberForm from './NewMemberForm';
import { getAllMembers } from '@/libs/supabase/queries/members.admin';

export default async function NewMemberPage() {
  const allMembers = await getAllMembers();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">새 구성원 등록</h1>
        <p className="text-sm text-gray-400 mt-0.5">초원지기, 목자, 목원을 등록합니다.</p>
      </div>
      <NewMemberForm allMembers={allMembers} />
    </div>
  );
}
