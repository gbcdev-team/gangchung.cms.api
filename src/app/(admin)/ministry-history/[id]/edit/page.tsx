import { notFound, redirect } from "next/navigation";
import HistoryForm from "../../HistoryForm";
import { getMinistryHistoryById } from "@/libs/supabase/queries/ministry-history.admin";
import { getViewer, canManageMinistryHistory } from "@/libs/permissions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditMinistryHistoryPage({ params }: Props) {
  const viewer = await getViewer();
  if (!viewer || !canManageMinistryHistory(viewer))
    redirect("/ministry-history");

  const { id } = await params;
  const history = await getMinistryHistoryById(id);
  if (!history) notFound();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          글 수정
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">{history.title}</p>
      </div>
      <HistoryForm history={history} />
    </div>
  );
}
