import Link from 'next/link';
import { Plus } from 'lucide-react';
import EmptyState from '@/components/admin/EmptyState';
import MembersView from './MembersView';
import { getAllMembers } from '@/libs/supabase/queries/members.admin';
import { buildMemberTree } from '@/libs/member-tree';

export default async function MembersPage() {
  const members = await getAllMembers();
  const tree = buildMemberTree(members);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">구성원 관리</h1>
          <p className="text-sm text-gray-400 mt-0.5">총 {members.length}명</p>
        </div>
        <Link
          href="/members/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
        >
          <Plus size={15} />
          새 구성원
        </Link>
      </div>

      {members.length === 0 ? (
        <EmptyState message="등록된 구성원이 없습니다" />
      ) : (
        <MembersView tree={tree} allMembers={members} />
      )}
    </div>
  );
}
