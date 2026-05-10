import { Suspense } from 'react';
import SearchResults from '@/src/components/pages/Discovery/SearchResults';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>}>
      <SearchResults />
    </Suspense>
  );
}
