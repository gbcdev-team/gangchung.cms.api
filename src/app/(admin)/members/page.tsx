import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import EmptyState from "@/components/admin/EmptyState";
import MembersView from "./MembersView";
import { getAllMembers } from "@/libs/supabase/queries/members.admin";
import { buildMemberTree } from "@/libs/member-tree";

export default async function MembersPage() {
  const members = await getAllMembers();
  const tree = buildMemberTree(members);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            구성원 관리
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">총 {members.length}명</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/members/import"
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Upload size={15} />
            엑셀로 전체 교체
          </Link>
          <Link
            href="/members/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
          >
            <Plus size={15} />새 구성원
          </Link>
        </div>
      </div>

      {members.length === 0 ? (
        <EmptyState message="등록된 구성원이 없습니다" />
      ) : (
        <MembersView tree={tree} allMembers={members} />
      )}
    </div>
  );
}
