import SettingsClientSection from "./SettingsClientSection";
import ApiSettingsSection from "./ApiSettingsSection";
import { getViewer } from "@/libs/permissions";

interface SettingsPageProps {
  searchParams: { apiPage?: string };
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const page = Number(searchParams.apiPage) || 1;
  const viewer = await getViewer();
  const role = viewer?.profile.role;
  const canManageApiConfigs = role === "목사" || role === "전도사";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          설정
        </h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          계정 관리와 상세 설정을 할 수 있어요.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <SettingsClientSection />
        {canManageApiConfigs && <ApiSettingsSection page={page} />}
      </div>
    </div>
  );
}
