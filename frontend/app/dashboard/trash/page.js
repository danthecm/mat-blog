import DashboardLayout from "@/src/components/pages/Dashboard/DashboardLayout";
import Trash from "@/src/components/pages/Dashboard/Trash";

export const metadata = {
  title: "Trash Management | Newsroom Dashboard | CM Blog",
  description: "View and manage deleted blog posts.",
};

export default function TrashPage() {
  return (
    <DashboardLayout>
      <Trash />
    </DashboardLayout>
  );
}
