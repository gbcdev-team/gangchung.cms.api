"use server";

import { getViewer } from "@/libs/permissions";
import { toggleApiConfig } from "@/libs/supabase/queries/content-api-configs";

export async function toggleApiConfigAction(
  id: string,
  isEnabled: boolean,
): Promise<void> {
  const viewer = await getViewer();
  const role = viewer?.profile.role;
  if (role !== "목사" && role !== "전도사") throw new Error("Unauthorized");

  await toggleApiConfig(id, isEnabled);
}
