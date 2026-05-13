'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/src/components/utils/api';
import FeaturedCard from '@/src/components/common/FeaturedCard';
import LoadingSpinner from '@/src/components/common/LoadingSpinner';

const SearchResults = () => {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`search/?q=${query}`);
        setResults(res.data.results || res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (query) performSearch();
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 min-h-screen">
      <div className="mb-10">
        <h1 className="text-3xl md:text-5xl font-bold text-[#1e1e1e] font-poppins">
          Search Results
        </h1>
        <p className="text-gray-500 mt-2">Showing results for <span className="text-primary font-bold">"{query}"</span></p>
      </div>
      
      {loading ? (
        <LoadingSpinner text="Searching for posts..." />
      ) : results.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <i className="fa-solid fa-magnifying-glass text-4xl text-gray-200 mb-4"></i>
          <p className="text-gray-500 font-medium">No results found for your query. Try different keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
           {results.map(blog => (
             <FeaturedCard key={blog.id} blog={blog} />
           ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
