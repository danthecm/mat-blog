'use client';

import React, { useEffect, useState, useContext } from "react";
import { useParams } from "next/navigation";
import PopularBlogList from '@/src/components/common/PopuplarBlogList';
import api from '@/src/components/utils/api';
import { store } from '@/src/components/stateManagement/store';
import Link from 'next/link';
import Comments from "./Comments";
import TagsList from '@/src/components/common/TagsList';
import AuthorInfo from '@/src/components/common/AuthorInfo';
import Poll from '@/src/components/common/Poll';

const SingleBlog = (props) => {
  const { state: { user, isAuthenticated, role } } = useContext(store);
  const [fetching, setFetching] = useState(true);
  const [activeBlog, setActiveBlog] = useState(null);
  const params = useParams();

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await api.get(`blogs/${params.slug}/`);
        setActiveBlog(res.data);
      } catch (err) {
        console.error("Failed to fetch blog");
      } finally {
        setFetching(false);
      }
    };
    if (params.slug) fetchBlog();
  }, [params.slug]);

  if (fetching) return <div className="min-h-screen flex items-center justify-center font-bold text-primary">Loading article...</div>;
  if (!activeBlog) return <div className="min-h-screen flex items-center justify-center font-bold text-red-500">Blog not found</div>;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[4fr_1.5fr] gap-x-12 px-4 py-8 md:px-10 lg:px-28 lg:py-16 bg-main-bg">
      <main>
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 mb-10">
          <TagsList tags={activeBlog.tags} />
          <h1 className="text-3xl md:text-5xl font-bold text-[#1e1e1e] mt-4 mb-6 font-poppins leading-tight">{activeBlog.title}</h1>
          <AuthorInfo 
            authorName={activeBlog.author?.username} 
            dateTime={activeBlog.created_at} 
            content={activeBlog.content}
          />

          {isAuthenticated && (role === 'admin' || role === 'editor' || (user === activeBlog.author?.username && activeBlog.status === 'draft')) && (
            <div className="mt-6 mb-2">
              <Link 
                href={`/dashboard/compose?slug=${activeBlog.slug}`}
                className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-bold hover:bg-primary hover:text-white transition-colors"
              >
                <i className="fa-solid fa-pen-to-square"></i> Edit Post
              </Link>
            </div>
          )}
          
          <img 
            src={activeBlog.cover} 
            alt={activeBlog.title} 
            className="w-full h-auto max-h-[600px] rounded-2xl my-10 object-cover shadow-2xl border border-gray-100" 
          />

          <div 
            className="prose prose-lg max-w-none text-gray-800 leading-relaxed mb-12"
            dangerouslySetInnerHTML={{ __html: activeBlog.content }} 
          />
          
          {/* Decorative Divider */}
          <div className="flex items-center justify-center gap-4 my-16 opacity-20">
            <div className="h-[2px] w-24 bg-primary rounded-full"></div>
            <i className="fa-solid fa-feather text-primary"></i>
            <div className="h-[2px] w-24 bg-primary rounded-full"></div>
          </div>
        </div>

        {/* Community Poll - Mock ID for demonstration */}
        <div className="mb-12">
           <Poll pollId={activeBlog.poll_id || 1} /> 
        </div>

        <Comments blogId={activeBlog.id} />
      </main>
      <aside>
        {/* Top Authors section disabled */}


        <PopularBlogList />
      </aside>
    </section>
  );
};

export default SingleBlog;
