"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  deleteMinistryHistoryAction,
  reorderMinistryHistoriesAction,
} from "./actions";
import type { MinistryHistory } from "@/types/ministry-history";

interface RowProps {
  item: MinistryHistory;
  canManage: boolean;
  onDelete: (item: MinistryHistory) => void;
}

function HistoryRow({ item, canManage, onDelete }: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !canManage });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 px-3 sm:px-4 py-3 bg-white dark:bg-gray-800 ${
        isDragging ? "relative z-10 shadow-lg rounded-lg" : ""
      }`}
    >
      {canManage && (
        <button
          type="button"
          aria-label="순서 변경"
          className="p-1 text-gray-300 hover:text-gray-500 cursor-grab touch-none shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
          {item.title}
        </p>
        <div className="flex items-center gap-2 flex-wrap mt-1">
          {item.category && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {item.category}
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${
              item.is_published
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            {item.is_published ? "발행됨" : "임시저장"}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(item.created_at).toLocaleDateString("ko-KR")}
          </span>
        </div>
      </div>

      {canManage && (
        <div className="shrink-0 flex items-center gap-1">
          <Link
            href={`/ministry-history/${item.id}/edit`}
            aria-label={`${item.title} 수정`}
            className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <Pencil size={14} />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(item)}
            aria-label={`${item.title} 삭제`}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </li>
  );
}

export default function HistoryList({
  items: initialItems,
  canManage,
}: {
  items: MinistryHistory[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [deleteTarget, setDeleteTarget] = useState<MinistryHistory | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  // router.refresh()로 서버 데이터가 바뀌면 로컬 순서도 맞춘다.
  useEffect(() => setItems(initialItems), [initialItems]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const previous = items;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, from, to);
    setItems(next);
    try {
      await reorderMinistryHistoriesAction(next.map((i) => i.id));
    } catch (err) {
      setItems(previous);
      toast.error(
        err instanceof Error ? err.message : "순서 저장에 실패했습니다.",
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMinistryHistoryAction(deleteTarget.id);
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="rounded-2xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
            {items.map((item) => (
              <HistoryRow
                key={item.id}
                item={item}
                canManage={canManage}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="글을 삭제하시겠습니까?"
        description={
          deleting
            ? "삭제 중..."
            : `"${deleteTarget?.title ?? ""}" 글을 삭제합니다. 삭제된 글은 복구할 수 없습니다.`
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
