import ComposePost from '@/src/components/pages/Editor/ComposePost';
import DashboardLayout from '@/src/components/pages/Dashboard/DashboardLayout';

export default function ComposePage() {
  return (
    <DashboardLayout>
      <ComposePost />
    </DashboardLayout>
  );
}
