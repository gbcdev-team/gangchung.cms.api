import { getAllMembers } from "@/libs/supabase/queries/members.admin";
import MemberImportView from "./MemberImportView";

export default async function MemberImportPage() {
  const currentCount = (await getAllMembers()).length;

  return <MemberImportView currentCount={currentCount} />;
}
