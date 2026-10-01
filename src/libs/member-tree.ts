import type { Member } from '@/types/member';

export interface MemberTreeNode extends Member {
  children: MemberTreeNode[];
}

export function buildMemberTree(members: Member[]): MemberTreeNode[] {
  const byParent = new Map<string | null, Member[]>();
  for (const m of members) {
    const list = byParent.get(m.parent_id) ?? [];
    list.push(m);
    byParent.set(m.parent_id, list);
  }
  const attach = (parentId: string | null): MemberTreeNode[] =>
    (byParent.get(parentId) ?? []).map((m) => ({ ...m, children: attach(m.id) }));
  return attach(null);
}

export function getDescendantIds(id: string, members: Member[]): Set<string> {
  const result = new Set<string>();
  for (const child of members.filter((m) => m.parent_id === id)) {
    result.add(child.id);
    getDescendantIds(child.id, members).forEach((d) => result.add(d));
  }
  return result;
}
