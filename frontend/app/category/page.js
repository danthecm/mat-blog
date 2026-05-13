'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/src/components/utils/api';
import { BLOG_CATEGORIES_URL } from '@/src/components/utils/urls';
import ErrorBoundary from '@/src/components/common/ErrorBoundary';
import LoadingSpinner from '@/src/components/common/LoadingSpinner';

const CategoryPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('blog-categories/');
        setCategories(res.data.results || res.data || []);
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <ErrorBoundary>
      <main className="bg-[#f9fafa] py-12 px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-8 font-poppins text-center">
            Explore <span className="text-primary">Categories</span>
          </h1>
          
          {loading ? (
            <LoadingSpinner text="Loading categories..." />
          ) : categories.length === 0 ? (
            <div className="text-center py-20 text-gray-500 italic">
              No categories found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {categories.map(cat => (
                <Link 
                  key={cat.id} 
                  href={`/search?q=${cat.name}`}
                  className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary transition-all group flex flex-col items-center text-center gap-3"
                >
                  <div className="w-16 h-16 rounded-full bg-[#e8f3f3] text-primary flex items-center justify-center text-2xl group-hover:bg-primary group-hover:text-white transition-colors">
                    <i className="fa-solid fa-layer-group"></i>
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 group-hover:text-primary transition-colors">
                    {cat.name}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {cat.blog_count} {cat.blog_count === 1 ? 'Post' : 'Posts'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </ErrorBoundary>
  );
};

export default CategoryPage;
