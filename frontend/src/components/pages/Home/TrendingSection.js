'use client';

import React, { useEffect, useState } from 'react';
import api from '@/src/components/utils/api';
import Link from 'next/link';

const TrendingSection = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await api.get('blogs/trending/');
        setBlogs(res.data.results || res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  if (loading || blogs.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 border-b border-gray-100">
      <h2 className="text-sm font-extrabold text-primary uppercase tracking-[0.2em] mb-10 flex items-center gap-3">
        <i className="fa-solid fa-chart-line"></i> Trending on CM Blog
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-8">
        {blogs.map((blog, index) => (
          <Link key={blog.id} href={`/${blog.slug}`} className="flex gap-4 group items-start">
            <span className="text-3xl md:text-4xl font-extrabold text-gray-100 group-hover:text-primary transition-colors leading-none pt-1">
              0{index + 1}
            </span>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-[#d1e7e5] text-primary rounded-full flex items-center justify-center text-[10px] font-bold uppercase shadow-sm">
                  {(blog.author?.display_name || blog.author?.username || 'U').charAt(0)}
                </div>
                <span className="text-xs font-bold text-gray-900 hover:underline">{blog.author?.display_name || blog.author?.username}</span>
              </div>
              <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2 font-poppins">
                {blog.title}
              </h3>
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2">
                {new Date(blog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                5 min read
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TrendingSection;
