"use client";

import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { MemberActions, MemberSummary } from "./MemberRow";
import MemberNode from "./MemberNode";
import type { Member } from "@/types/member";
import type { MemberTreeNode } from "@/libs/member-tree";

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
  const sortedTree = useMemo(
    () => [...tree].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [tree],
  );
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [activeLeaderId, setActiveLeaderId] = useState(sortedTree[0]?.id ?? "");

  const activeLeader =
    sortedTree.find((l) => l.id === activeLeaderId) ?? sortedTree[0];

  const trimmed = query.trim();
  const isSearching = trimmed.length > 0;
  const shepherds = useMemo(
    () => (activeLeader ? filterTree(activeLeader.children, trimmed) : []),
    [activeLeader, trimmed],
  );
  const resultCount = useMemo(() => countNodes(shepherds), [shepherds]);

  const isFlatGroup =
    shepherds.length > 0 && shepherds.every((s) => s.position === "목원");

  if (!activeLeader) return null;

  return (
    <div className="space-y-4">
      {sortedTree.length > 1 && (
        <Tabs value={activeLeader.id} onValueChange={setActiveLeaderId}>
          <div className="overflow-x-auto">
            <TabsList className="w-max gap-3">
              {sortedTree.map((leader) => (
                <TabsTrigger
                  key={leader.id}
                  value={leader.id}
                  className="px-2 py-1"
                >
                  {leader.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      )}

      <h2 className="sr-only">{activeLeader.name}</h2>
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3">
        <MemberSummary member={activeLeader} />
        <MemberActions member={activeLeader} />
      </div>

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
          {isSearching
            ? `검색 결과 ${resultCount}명`
            : `${activeLeader.name} ${countNodes(activeLeader.children)}명 (전체 ${allMembers.length}명)`}
        </p>
      </div>

      {shepherds.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">
          {isSearching ? "검색 결과가 없습니다." : "소속된 목자가 없습니다."}
        </p>
      ) : isFlatGroup ? (
        <ul className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 sm:px-5 divide-y divide-gray-100 dark:divide-gray-700">
          {shepherds.map((member) => (
            <MemberNode key={member.id} member={member} />
          ))}
        </ul>
      ) : isSearching ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 sm:px-5 divide-y divide-gray-100 dark:divide-gray-700">
          {shepherds.map((shepherd) => (
            <div key={shepherd.id} className="py-4">
              <div className="flex items-center gap-1">
                <div className="flex-1">
                  <MemberSummary member={shepherd} />
                </div>
                <MemberActions member={shepherd} />
              </div>
              {shepherd.children.length === 0 ? (
                <p className="text-xs text-gray-400 pl-1 mt-2">
                  소속된 목원이 없습니다.
                </p>
              ) : (
                <ul className="space-y-1 mt-2">
                  {shepherd.children.map((child) => (
                    <MemberNode key={child.id} member={child} />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Accordion
          type="multiple"
          value={openIds}
          onValueChange={setOpenIds}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-4 sm:px-5"
        >
          {shepherds.map((shepherd) => (
            <AccordionItem key={shepherd.id} value={shepherd.id}>
              <div className="flex items-center gap-1">
                <AccordionTrigger className="flex-1 hover:no-underline">
                  <MemberSummary member={shepherd} />
                </AccordionTrigger>
                <MemberActions member={shepherd} />
              </div>
              <AccordionContent>
                {shepherd.children.length === 0 ? (
                  <p className="text-xs text-gray-400 pl-1">
                    소속된 목원이 없습니다.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {shepherd.children.map((child) => (
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
