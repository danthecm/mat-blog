'use client';

import React, { useEffect, useState, useContext } from 'react';
import api from '@/src/components/utils/api';
import { store } from '@/src/components/stateManagement/store';
import Link from 'next/link';
import { confirmModal, toast } from '@/src/components/utils/swal';

const PublishedPosts = () => {
  const [published, setPublished] = useState([]);
  const [loading, setLoading] = useState(true);
  const { state: { user, role, groups } } = useContext(store);

  const inGroup = (...names) => {
    if (Array.isArray(groups) && groups.length > 0) return names.some(n => groups.includes(n));
    return role ? names.includes(role) : false;
  };
  const isEditor = inGroup('editor', 'admin');

  const fetchPublished = async () => {
    try {
      setLoading(true);
      const res = await api.get('/blogs/all_published/');
      setPublished(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to fetch published posts", err);
      toast.error("Failed to fetch published posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isEditor) {
      fetchPublished();
    }
  }, [user, isEditor]);

  const handleToggleFeatured = async (slug, currentStatus) => {
    try {
      await api.patch(`/blogs/${slug}/`, { featured: !currentStatus });
      toast.success(`Post ${!currentStatus ? 'featured' : 'unfeatured'} successfully`);
      fetchPublished();
    } catch (err) {
      toast.error("Failed to update featured status");
    }
  };

  const handleUnpublish = async (slug) => {
    const result = await confirmModal(
      "Unpublish Post?", 
      "This will move the post back to draft status. It will no longer be visible to the public.",
      "Yes, unpublish"
    );
    if (!result.isConfirmed) return;

    try {
      await api.patch(`/blogs/${slug}/`, { status: 'draft' });
      toast.success("Post unpublished and moved to drafts");
      fetchPublished();
    } catch (err) {
      toast.error("Failed to unpublish post");
    }
  };

  const handleDelete = async (slug) => {
    const result = await confirmModal("Move to Trash?", "This post will be moved to the trash section. You can restore it later.");
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/blogs/${slug}/`);
      toast.success("Post moved to trash");
      fetchPublished();
    } catch (err) {
      toast.error("Error deleting post");
    }
  };

  if (!isEditor) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg text-center">
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p>You do not have permission to access this section.</p>
      </div>
    );
  }

  if (loading) return <div className="p-10 text-center text-gray-500">Loading published posts...</div>;

  return (
    <section className="bg-white rounded-lg shadow-sm p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-primary font-poppins">Published Posts</h1>
          <p className="text-sm text-gray-500 font-medium">Manage visibility and featured stories</p>
        </div>
        <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
          {published.length} Posts
        </span>
      </div>
      
      {published.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-lg">
          <i className="fa-solid fa-newspaper text-gray-300 text-5xl mb-4"></i>
          <p className="text-gray-500">No published posts found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {published.map((p) => (
            <div key={p.slug} className={`border ${p.featured ? 'border-primary bg-primary/5' : 'border-gray-200'} rounded-xl overflow-hidden flex flex-col hover:shadow-lg transition-all duration-300`}>
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${p.featured ? 'bg-primary text-white' : 'bg-green-100 text-green-700'}`}>
                    {p.featured ? '★ Featured' : 'Published'}
                  </span>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(p.created_at).toLocaleDateString()}</p>
                    <p className="text-[10px] text-primary font-bold uppercase mt-1">@{p.author?.username}</p>
                  </div>
                </div>
                
                <h3 className="font-bold text-lg mb-3 line-clamp-2 text-gray-900 leading-tight">{p.title}</h3>
                
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                  <span><i className="fa-regular fa-eye mr-1"></i> {p.view_count || 0}</span>
                  <span><i className="fa-regular fa-clock mr-1"></i> {p.read_time || 0} min</span>
                </div>
              </div>

              <div className="bg-gray-50/80 p-4 border-t border-gray-100 flex gap-2">
                <button 
                  onClick={() => handleToggleFeatured(p.slug, p.featured)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                    p.featured 
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-400 hover:text-amber-600'
                  }`}
                  title={p.featured ? "Remove from Featured" : "Add to Featured"}
                >
                  <i className={`fa-${p.featured ? 'solid' : 'regular'} fa-star`}></i>
                  {p.featured ? 'Unfeature' : 'Feature'}
                </button>

                <div className="flex gap-2">
                    <Link 
                        href={`/dashboard/compose?slug=${p.slug}`}
                        className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-primary hover:border-primary transition-all"
                        title="Edit Post"
                    >
                        <i className="fa-solid fa-pen-to-square"></i>
                    </Link>
                    <a 
                        href={`/${p.slug}`}
                        target="_blank"
                        className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-blue-500 hover:border-blue-500 transition-all"
                        title="View Live"
                    >
                        <i className="fa-solid fa-arrow-up-right-from-square"></i>
                    </a>
                    <button 
                        onClick={() => handleUnpublish(p.slug)}
                        className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-amber-600 hover:border-amber-600 transition-all"
                        title="Unpublish (Move to Draft)"
                    >
                        <i className="fa-solid fa-file-export"></i>
                    </button>
                    <button 
                        onClick={() => handleDelete(p.slug)}
                        className="p-2 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-red-600 hover:border-red-600 transition-all"
                        title="Move to Trash"
                    >
                        <i className="fa-solid fa-trash-can"></i>
                    </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default PublishedPosts;
