import Link from "next/link";
import { Plus } from "lucide-react";
import EmptyState from "@/components/admin/EmptyState";
import HistoryList from "./HistoryList";
import { getAllMinistryHistories } from "@/libs/supabase/queries/ministry-history.admin";
import { getViewer, canManageMinistryHistory } from "@/libs/permissions";

export default async function MinistryHistoryPage() {
  const [items, viewer] = await Promise.all([
    getAllMinistryHistories(),
    getViewer(),
  ]);
  const canManage = !!viewer && canManageMinistryHistory(viewer);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            지난 사역 히스토리
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">총 {items.length}건</p>
        </div>
        {canManage && (
          <Link
            href="/ministry-history/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-80 transition-opacity whitespace-nowrap shrink-0"
          >
            <Plus size={15} />새 글 작성
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState message="등록된 글이 없습니다" />
      ) : (
        <HistoryList items={items} canManage={canManage} />
      )}
    </div>
  );
}
