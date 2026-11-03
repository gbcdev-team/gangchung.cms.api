"use server";

import {
  createMinistryHistory,
  updateMinistryHistory,
  deleteMinistryHistory,
  reorderMinistryHistories,
} from "@/libs/supabase/queries/ministry-history.admin";
import {
  MINISTRY_HISTORY_BUCKET,
  uploadImage,
} from "@/libs/supabase/queries/storage";
import { getViewer, canManageMinistryHistory } from "@/libs/permissions";
import {
  ministryHistoryFormSchema,
  type MinistryHistory,
  type MinistryHistoryFormInput,
} from "@/types/ministry-history";

async function assertCanManage(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) throw new Error("로그인이 필요합니다.");
  if (!canManageMinistryHistory(viewer)) {
    throw new Error("글을 관리할 권한이 없습니다.");
  }
}

async function uploadThumbnail(
  formData: FormData,
): Promise<string | undefined> {
  const file = formData.get("thumbnail");
  if (!(file instanceof File) || file.size === 0) return undefined;
  return uploadImage(file, MINISTRY_HISTORY_BUCKET, crypto.randomUUID());
}

// 서버 액션은 공개 POST 엔드포인트라 클라이언트 zod 검증을 신뢰하지 않고 다시 파싱한다.
function parseInput(input: MinistryHistoryFormInput): MinistryHistoryFormInput {
  const parsed = ministryHistoryFormSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
    );
  }
  return parsed.data;
}

export async function createMinistryHistoryAction(
  input: MinistryHistoryFormInput,
  formData: FormData,
): Promise<MinistryHistory> {
  await assertCanManage();
  const data = parseInput(input);
  const thumbnailUrl = await uploadThumbnail(formData);
  return createMinistryHistory(data, thumbnailUrl ?? null);
}

export async function updateMinistryHistoryAction(
  id: string,
  input: MinistryHistoryFormInput,
  formData: FormData,
  removeThumbnail: boolean,
): Promise<MinistryHistory> {
  await assertCanManage();
  const data = parseInput(input);
  const uploaded = await uploadThumbnail(formData);
  const thumbnailUrl = uploaded ?? (removeThumbnail ? null : undefined);
  return updateMinistryHistory(id, data, thumbnailUrl);
}

export async function deleteMinistryHistoryAction(id: string): Promise<void> {
  await assertCanManage();
  return deleteMinistryHistory(id);
}

export async function reorderMinistryHistoriesAction(
  ids: string[],
): Promise<void> {
  await assertCanManage();
  return reorderMinistryHistories(ids);
}
