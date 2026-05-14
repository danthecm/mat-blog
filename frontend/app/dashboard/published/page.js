import DashboardLayout from '@/src/components/pages/Dashboard/DashboardLayout';
import PublishedPosts from '@/src/components/pages/Dashboard/PublishedPosts';

export const metadata = {
  title: 'Published Posts Management | Newsroom Dashboard',
  description: 'Manage published blog posts, feature stories, and visibility.',
};

export default function PublishedPostsPage() {
  return (
    <DashboardLayout>
      <PublishedPosts />
    </DashboardLayout>
  );
}
