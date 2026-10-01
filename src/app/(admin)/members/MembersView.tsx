'use client';

import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { MemberActions, MemberSummary } from './MemberRow';
import MemberNode from './MemberNode';
import type { Member } from '@/types/member';
import type { MemberTreeNode } from '@/libs/member-tree';

interface MembersViewProps {
  tree: MemberTreeNode[];
  allMembers: Member[];
}

function nodeMatches(node: MemberTreeNode, query: string): boolean {
  return node.name.includes(query) || (node.phone?.includes(query) ?? false);
}

function filterTree(nodes: MemberTreeNode[], query: string): MemberTreeNode[] {
  if (!query) return nodes;
  const result: MemberTreeNode[] = [];
  for (const node of nodes) {
    const children = filterTree(node.children, query);
    if (nodeMatches(node, query) || children.length > 0) {
      result.push({ ...node, children });
    }
  }
  return result;
}

function countNodes(nodes: MemberTreeNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countNodes(n.children), 0);
}

export default function MembersView({ tree, allMembers }: MembersViewProps) {
  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState<string[]>([]);

  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;
  const filtered = useMemo(() => filterTree(tree, trimmed), [tree, trimmed]);
  const resultCount = useMemo(() => countNodes(filtered), [filtered]);

  const effectiveOpen = isSearching
    ? Array.from(new Set([...openIds, ...filtered.map((n) => n.id)]))
    : openIds;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="member-search" className="sr-only">
          이름 또는 전화번호로 검색
        </label>
        <Input
          id="member-search"
          type="search"
          placeholder="이름 또는 전화번호로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <p className="mt-1.5 text-xs text-gray-400" aria-live="polite">
          {isSearching ? `검색 결과 ${resultCount}명` : `전체 ${allMembers.length}명`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">검색 결과가 없습니다.</p>
      ) : (
        <Accordion
          type="multiple"
          value={effectiveOpen}
          onValueChange={setOpenIds}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 sm:px-5"
        >
          {filtered.map((leader) => (
            <AccordionItem key={leader.id} value={leader.id}>
              <div className="flex items-center gap-1">
                <AccordionTrigger className="flex-1 hover:no-underline">
                  <MemberSummary member={leader} />
                </AccordionTrigger>
                <MemberActions member={leader} />
              </div>
              <AccordionContent>
                {leader.children.length === 0 ? (
                  <p className="text-xs text-gray-400 pl-1">소속된 목자/목원이 없습니다.</p>
                ) : (
                  <ul className="space-y-1">
                    {leader.children.map((child) => (
                      <MemberNode key={child.id} member={child} />
                    ))}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
