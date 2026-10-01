import { MemberActions, MemberSummary } from './MemberRow';
import type { MemberTreeNode } from '@/libs/member-tree';

export default function MemberNode({ member }: { member: MemberTreeNode }) {
  return (
    <li className="py-1.5">
      <div className="flex items-center justify-between gap-2">
        <MemberSummary member={member} />
        <MemberActions member={member} />
      </div>
      {member.children.length > 0 && (
        <ul className="mt-1.5 pl-5 border-l border-gray-100 dark:border-gray-700 space-y-1">
          {member.children.map((child) => (
            <MemberNode key={child.id} member={child} />
          ))}
        </ul>
      )}
    </li>
  );
}
