'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "./Header";
import RecentPostCard from '@/src/components/common/RecentPostCard';
import TodayUpdate from '@/src/components/common/TodayUpdate';
import useSWR from 'swr';
import { BLOG_URL, FEATURED_BLOG_URL, BLOG_CATEGORIES_URL, BLOG_TAGS_URL } from '@/src/components/utils/urls';
import api from '@/src/components/utils/api';

import LoadingSpinner from '@/src/components/common/LoadingSpinner';

const fetcher = url => api.get(url).then(res => res.data);

const Home = (props) => {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data: featuredRes } = useSWR(FEATURED_BLOG_URL, fetcher);
  const { data: recentRes, error: recentError, isLoading: recentLoading } = useSWR(`${BLOG_URL}?page=${page}`, fetcher);
  const { data: tagsRes } = useSWR(BLOG_TAGS_URL, fetcher);
  const { data: catRes, isLoading: catLoading } = useSWR(BLOG_CATEGORIES_URL, fetcher);
  
  const featured = featuredRes ? (Array.isArray(featuredRes) ? featuredRes : (featuredRes.results || [])) : [];
  const recentRaw = recentRes ? (Array.isArray(recentRes) ? recentRes : (recentRes.results || [])) : [];
  const tags = tagsRes ? (Array.isArray(tagsRes) ? tagsRes : (tagsRes.results || [])) : [];
  const categories = catRes ? (Array.isArray(catRes) ? catRes : (catRes.results || [])) : [];
  
  const featuredIds = new Set(featured.map(b => b.id));
  const filteredRecent = recentRaw.filter(b => !featuredIds.has(b.id));

  const loading = recentLoading || (!recentRes && !recentError);

  return (
    <>
      <Header />
      <main className="grid grid-cols-1 lg:grid-cols-[4fr_1.5fr] px-[1rem] py-[1.5rem] lg:px-[5rem] lg:py-[2rem] gap-x-[3rem]">
        <div>
          <h3 className="pb-[2rem] text-2xl font-bold font-poppins">
            <span className="bg-[#00aaa1] text-[#e8f3f3] px-[2px] font-bold my-[10px] mx-0 mr-2">Recently</span> Posted{" "}
          </h3>
          <section className="grid grid-cols-1 md:grid-cols-2 gap-[3rem]">
            <RecentPostCard blogs={filteredRecent} loading={loading} />
          </section>
          
          {/* Pagination Controls */}
          {!loading && recentRes && !Array.isArray(recentRes) && (recentRes.next || recentRes.previous) && (
            <div className="flex justify-between items-center mt-8">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={!recentRes.previous}
                className="bg-primary text-white px-5 py-2 rounded-md font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#008f87] transition-colors"
              >
                <i className="fa-solid fa-arrow-left mr-2"></i> Previous
              </button>
              <span className="text-gray-500 font-bold text-sm">Page {page}</span>
              <button 
                onClick={() => setPage(p => p + 1)} 
                disabled={!recentRes.next}
                className="bg-primary text-white px-5 py-2 rounded-md font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#008f87] transition-colors"
              >
                Next <i className="fa-solid fa-arrow-right ml-2"></i>
              </button>
            </div>
          )}
        </div>
        
        <aside>
          {/* Top Authors section disabled */}


          <h3 className="mb-[40px] text-2xl font-bold font-poppins">
            <span className="bg-[#00aaa1] text-[#e8f3f3] px-[2px] font-bold my-[10px] mx-0">Categories</span>
          </h3>
          <div className="mb-[60px]">
            {(categories.length === 0 && !catLoading) && (
              <div className="text-gray-400 italic px-[10px]">No categories yet.</div>
            )}
            {catLoading && categories.length === 0 && (
               <LoadingSpinner size="sm" text="Loading..." />
            )}
            {categories.slice(0, 8).map((cat, index, array) => (
              <div 
                key={cat.id} 
                className="px-[10px] py-[2px] font-bold my-[15px] cursor-pointer hover:text-primary transition-colors"
                onClick={() => router.push(`/search?q=${cat.name}`)}
              >
                <p className="mb-[5px] text-[#555555] hover:text-primary transition-colors">
                  {cat.name} <span className="float-right text-gray-400 font-medium">({String(cat.blog_count || 0).padStart(2, '0')})</span>
                </p>
                {index < array.length - 1 && (
                  <hr className="border-none border-t-[1.5px] border-dotted border-[#777777]" />
                )}
              </div>
            ))}
          </div>

          <h3 className="mb-[40px] text-2xl font-bold font-poppins">
            <span className="bg-[#00aaa1] text-[#e8f3f3] px-[2px] font-bold my-[10px] mx-0 mr-2">Today's</span> Update
          </h3>
          <TodayUpdate />

          <h3 className="mb-[40px] text-2xl font-bold font-poppins">
            <span className="bg-[#00aaa1] text-[#e8f3f3] px-[2px] font-bold my-[10px] mx-0 mr-2 hover:text-white">Search</span> With Tags
          </h3>
          <div className="flex flex-wrap">
            {tags.slice(0, 15).map((tag) => (
              <p 
                key={tag.id} 
                onClick={() => router.push(`/search?q=${tag.title}`)}
                className="inline text-[15px] text-[#666666] px-[20px] py-[10px] border border-[#777777] rounded-[5px] m-[0_20px_10px_0] hover:cursor-pointer hover:bg-[#00aaa1] hover:text-[#ffff] hover:border-transparent transition-all"
              >
                {tag.title}
              </p>
            ))}
          </div>
        </aside>
      </main>
    </>
  );
};

export default Home;
