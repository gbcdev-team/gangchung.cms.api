import { redirect } from "next/navigation";
import HistoryForm from "../HistoryForm";
import { getViewer, canManageMinistryHistory } from "@/libs/permissions";

export default async function NewMinistryHistoryPage() {
  const viewer = await getViewer();
  if (!viewer || !canManageMinistryHistory(viewer))
    redirect("/ministry-history");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          새 글 작성
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          작성 후 발행하면 프론트에 즉시 노출됩니다.
        </p>
      </div>
      <HistoryForm defaultSlug={String(Date.now())} />
    </div>
  );
}
