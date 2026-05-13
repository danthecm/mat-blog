'use client';

import UserManagement from '@/src/components/pages/Dashboard/UserManagement';
import DashboardLayout from '@/src/components/pages/Dashboard/DashboardLayout';

export default function UserManagementPage() {
  return (
    <DashboardLayout>
      <UserManagement />
    </DashboardLayout>
  );
}
