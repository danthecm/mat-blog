'use client';

import React from 'react';
import FeaturedCard from '@/src/components/common/FeaturedCard';
import PopuplarBlogList from '@/src/components/common/PopuplarBlogList';

const FeaturedSection = ({ blogs, loading }) => {
  if (loading) return null;
  if (!blogs || blogs.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 mb-16">
      <div className="grid grid-cols-1 lg:grid-cols-[2.8fr_1.2fr] gap-x-12">
        <div>
          <h3 className="text-2xl font-bold mb-8 flex items-center">
            <span className="bg-primary text-white px-3 py-1 mr-3">Featured</span> This Month
          </h3>
          <div className="flex flex-col gap-10">
            {blogs.map(blog => (
                <FeaturedCard key={blog.id} blog={blog} />
            ))}
          </div>
        </div>
        <div className="mt-12 lg:mt-0">
          <PopuplarBlogList />
        </div>
      </div>
    </section>
  );
};

export default FeaturedSection;
