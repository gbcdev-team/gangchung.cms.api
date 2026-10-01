'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { deleteMemberAction } from './actions';
import type { Member } from '@/types/member';

const POSITION_CLASS: Record<Member['position'], string> = {
  초원지기: 'bg-black text-white dark:bg-white dark:text-black',
  임원단: 'bg-indigo-600 text-white dark:bg-indigo-400 dark:text-indigo-950',
  목자: 'bg-gray-700 text-white dark:bg-gray-300 dark:text-gray-900',
  목원: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
};

export function MemberSummary({ member }: { member: Member }) {
  const detailParts = [member.phone, member.gender, member.age_group, member.birth_date].filter(Boolean);
  return (
    <span className="flex items-center gap-2.5 flex-wrap text-left">
      <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${POSITION_CLASS[member.position]}`}>
        {member.position}
      </span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{member.name}</span>
      {detailParts.length > 0 && (
        <span className="text-xs text-gray-400">{detailParts.join(' · ')}</span>
      )}
    </span>
  );
}

export function MemberActions({ member }: { member: Member }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteMemberAction(member.id);
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="shrink-0 flex items-center gap-1">
      <Link
        href={`/members/${member.id}/edit`}
        aria-label={`${member.name} 수정`}
        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <Pencil size={14} />
      </Link>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label={`${member.name} 삭제`}
        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
      >
        <Trash2 size={14} />
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="구성원을 삭제하시겠습니까?"
        description={deleting ? '삭제 중...' : `${member.name} 님을 삭제합니다. 하위 구성원이 있으면 삭제할 수 없습니다.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
