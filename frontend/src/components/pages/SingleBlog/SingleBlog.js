'use client';

import React, { useEffect, useState, useContext } from "react";
import { useParams, notFound } from "next/navigation";
import PopularBlogList from '@/src/components/common/PopuplarBlogList';
import api from '@/src/components/utils/api';
import { store } from '@/src/components/stateManagement/store';
import Link from 'next/link';
import Comments from "./Comments";
import TagsList from '@/src/components/common/TagsList';
import AuthorInfo from '@/src/components/common/AuthorInfo';
import Poll from '@/src/components/common/Poll';
import { useRole } from '@/src/components/hooks/useRole';
import RichTextRenderer from '@/src/components/common/RichTextRenderer';
import LoadingSpinner from '@/src/components/common/LoadingSpinner';

import { resolveImageUrl } from '@/src/components/utils/imageHelper';

const SingleBlog = ({ isPreview = false, ...props }) => {
  const { user, isAuthenticated, isEditor } = useRole();
  const [fetching, setFetching] = useState(true);
  const [activeBlog, setActiveBlog] = useState(null);
  const params = useParams();

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await api.get(`blogs/${params.slug}/`);
        const blogData = res.data;

        // Security check: If not in preview mode, ensure the blog is actually published.
        // This prevents the normal /[slug] route from acting as a preview for authors/editors.
        if (!isPreview && blogData.status !== 'published') {
          setActiveBlog(null);
        } else {
          setActiveBlog(blogData);
        }
      } catch (err) {
        console.error("Failed to fetch blog");
        setActiveBlog(null);
      } finally {
        setFetching(false);
      }
    };
    if (params.slug) fetchBlog();
  }, [params.slug, isPreview]);

  const handleLike = async () => {
    try {
      const res = await api.post(`blogs/${activeBlog.slug}/like/`);
      setActiveBlog(prev => ({ ...prev, like_count: res.data.like_count }));
    } catch (err) {
      console.error("Failed to like blog", err);
    }
  };

  if (fetching) return <LoadingSpinner text="Fetching article..." />;
  if (!activeBlog) return notFound();

  return (
    <section className="relative grid grid-cols-1 lg:grid-cols-[4fr_1.5fr] gap-x-12 gap-y-12 px-4 py-8 md:px-10 lg:px-16 lg:py-16 bg-main-bg overflow-x-hidden">
      {isPreview && (
        <>
          {/* Watermark Overlay */}
          <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center overflow-hidden select-none">
            <div className="text-[10vw] font-black text-gray-500/5 rotate-[-45deg] whitespace-nowrap uppercase tracking-tighter">
              Preview Mode • Preview Mode • Preview Mode
            </div>
          </div>
          
          {/* Top Banner */}
          <div className="fixed top-0 left-0 w-full bg-amber-500 text-white py-2 z-[10000] text-center font-bold shadow-md flex items-center justify-center gap-3">
             <i className="fa-solid fa-eye text-lg"></i>
             <span>You are viewing this post in Preview Mode. This version is not yet published to the public.</span>
             <button 
               onClick={() => window.close()} 
               className="ml-4 bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm transition-colors"
             >
               Close Preview
             </button>
          </div>
        </>
      )}

      <main className={`min-w-0 ${isPreview ? 'mt-10' : ''}`}>
        <article className="bg-white p-6 md:p-12 rounded-3xl shadow-sm border border-gray-100 mb-10 overflow-hidden relative">
          {isPreview && (
            <div className="absolute top-0 right-0 bg-amber-100 text-amber-700 px-6 py-2 rounded-bl-3xl font-bold uppercase tracking-widest text-xs border-l border-b border-amber-200">
              Preview
            </div>
          )}
          <header>
            <TagsList tags={activeBlog.tags} />
            <h1 className="text-3xl md:text-5xl font-extrabold text-[#1a202c] mt-6 mb-8 font-poppins leading-tight tracking-tight break-words">
              {activeBlog.title}
            </h1>
            <AuthorInfo 
              authorName={activeBlog.author?.display_name || activeBlog.author?.username} 
              dateTime={activeBlog.created_at} 
              content={activeBlog.content}
            />

            {isAuthenticated && (isEditor || (user === activeBlog.author?.username && activeBlog.status === 'draft')) && (
              <div className="mt-8 mb-4">
                <Link 
                  href={`/dashboard/compose?slug=${activeBlog.slug}`}
                  className="inline-flex items-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-full font-bold hover:bg-primary hover:text-white transition-all duration-300 shadow-sm"
                >
                  <i className="fa-solid fa-pen-to-square"></i> Edit Post
                </Link>
              </div>
            )}
          </header>
          
          <figure className="relative w-full aspect-video md:aspect-[21/9] rounded-2xl my-12 overflow-hidden shadow-2xl border border-gray-100">
            <img 
              src={resolveImageUrl(activeBlog.cover)} 
              alt={activeBlog.title} 
              className="w-full h-full object-cover" 
            />
          </figure>

          <RichTextRenderer content={activeBlog.content} className="mb-16" />
          
          <div className="flex items-center gap-4 mt-8">
            <button 
              onClick={handleLike}
              className="flex items-center gap-2 px-6 py-3 bg-[#e8f3f3] text-primary rounded-full font-bold hover:bg-primary hover:text-white transition-colors"
            >
              <i className="fa-regular fa-thumbs-up text-xl"></i>
              <span>{activeBlog.like_count || 0} Likes</span>
            </button>
          </div>

          {/* Decorative Divider */}
          <div className="flex items-center justify-center gap-4 my-16 opacity-20">
            <div className="h-[2px] w-24 bg-primary rounded-full"></div>
            <i className="fa-solid fa-feather text-primary"></i>
            <div className="h-[2px] w-24 bg-primary rounded-full"></div>
          </div>
        </article>


        {/* Community Poll - Mock ID for demonstration */}
        <div className="mb-12">
           <Poll pollId={activeBlog.poll_id || 1} /> 
        </div>

        <Comments blogId={activeBlog.id} />
      </main>
      <aside className="min-w-0">
        {/* Top Authors section disabled */}


        <PopularBlogList />
      </aside>
    </section>
  );
};

export default SingleBlog;
