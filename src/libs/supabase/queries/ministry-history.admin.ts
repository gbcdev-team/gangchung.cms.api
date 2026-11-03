import { createAdminClient } from "@/libs/supabase/admin";
import type {
  MinistryHistory,
  MinistryHistoryFormInput,
} from "@/types/ministry-history";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TABLE = "gangchung_ministry_histories";
const UNIQUE_VIOLATION = "23505";

function assertValidUUID(id: string): void {
  if (!id || !UUID_REGEX.test(id))
    throw new Error("유효하지 않은 글 ID입니다.");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMinistryHistory(row: any): MinistryHistory {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    thumbnail_url: row.thumbnail_url ?? null,
    category: row.category ?? null,
    content: row.content ?? null,
    is_published: row.is_published,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toPayload(input: MinistryHistoryFormInput) {
  return {
    title: input.title,
    slug: input.slug,
    category: input.category || null,
    content: input.content || null,
    is_published: input.is_published,
  };
}

export async function getAllMinistryHistories(): Promise<MinistryHistory[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[getAllMinistryHistories]", error);
    throw new Error("글 목록을 불러오지 못했습니다.");
  }
  return (data ?? []).map(toMinistryHistory);
}

export async function getMinistryHistoryById(
  id: string,
): Promise<MinistryHistory | null> {
  assertValidUUID(id);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[getMinistryHistoryById]", error);
    throw new Error("글을 불러오지 못했습니다.");
  }
  return toMinistryHistory(data);
}

// 새 글은 목록 맨 위에 오도록 현재 최솟값보다 1 작은 sort_order를 부여한다.
async function nextTopSortOrder(): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("sort_order")
    .order("sort_order", { ascending: true })
    .limit(1);
  if (error) {
    console.error("[nextTopSortOrder]", error);
    throw new Error("글 순서를 계산하지 못했습니다.");
  }
  return (data?.[0]?.sort_order ?? 1) - 1;
}

export async function createMinistryHistory(
  input: MinistryHistoryFormInput,
  thumbnailUrl: string | null,
): Promise<MinistryHistory> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      ...toPayload(input),
      thumbnail_url: thumbnailUrl,
      sort_order: await nextTopSortOrder(),
    })
    .select()
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION)
      throw new Error("이미 사용 중인 슬러그입니다.");
    console.error("[createMinistryHistory]", error);
    throw new Error("글 저장에 실패했습니다.");
  }
  return toMinistryHistory(data);
}

// thumbnailUrl: undefined면 기존 이미지 유지, null이면 제거, 문자열이면 교체.
export async function updateMinistryHistory(
  id: string,
  input: MinistryHistoryFormInput,
  thumbnailUrl: string | null | undefined,
): Promise<MinistryHistory> {
  assertValidUUID(id);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ...toPayload(input),
      ...(thumbnailUrl !== undefined && { thumbnail_url: thumbnailUrl }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION)
      throw new Error("이미 사용 중인 슬러그입니다.");
    console.error("[updateMinistryHistory]", error);
    throw new Error("글 수정에 실패했습니다.");
  }
  return toMinistryHistory(data);
}

export async function deleteMinistryHistory(id: string): Promise<void> {
  assertValidUUID(id);
  const supabase = createAdminClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) {
    console.error("[deleteMinistryHistory]", error);
    throw new Error("글 삭제에 실패했습니다.");
  }
}

export async function reorderMinistryHistories(ids: string[]): Promise<void> {
  ids.forEach(assertValidUUID);
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("reorder_ministry_histories", { ids });
  if (error) {
    console.error("[reorderMinistryHistories]", error);
    throw new Error("글 순서 저장에 실패했습니다.");
  }
}
