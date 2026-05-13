'use client';

import React, { useEffect, useState, useContext } from 'react';
import api from '@/src/components/utils/api';
import { store } from '@/src/components/stateManagement/store';
import Link from 'next/link';

import { confirmModal, toast } from '@/src/components/utils/swal';

const MyDrafts = () => {
  const [drafts, setDrafts] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [published, setPublished] = useState([]);
  const [trash, setTrash] = useState([]);
  const [loading, setLoading] = useState(true);
  const { state: { user, role, groups } } = useContext(store);

  // Groups are the primary source of truth; role is the fallback
  const inGroup = (...names) => {
    if (Array.isArray(groups) && groups.length > 0) return names.some(n => groups.includes(n));
    return role ? names.includes(role) : false;
  };
  const isAdmin = inGroup('admin');

  const fetchData = async () => {
    try {
      const endpoints = [
        api.get('/blogs/drafts/'),
        api.get('/blogs/submissions/')
      ];

      if (isAdmin) {
        endpoints.push(api.get('/blogs/all_published/'));
        endpoints.push(api.get('/blogs/trash/'));
      }

      const results = await Promise.all(endpoints);
      
      setDrafts(results[0].data.results || results[0].data);
      setSubmissions(results[1].data.results || results[1].data);
      
      if (isAdmin) {
        setPublished(results[2].data.results || results[2].data);
        setTrash(results[3].data.results || results[3].data);
      }
    } catch (err) {
      console.error("Failed to fetch blog data");
      toast.error("Failed to fetch blog data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, isAdmin]);

  const handleDelete = async (slug) => {
    const result = await confirmModal("Move to Trash?", "This post will be moved to the trash section. You can restore it later.");
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/blogs/${slug}/`);
      toast.success("Post moved to trash");
      fetchData(); // Refresh all lists
    } catch (err) {
      toast.error("Error deleting post");
    }
  };

  const handleRestore = async (slug) => {
    try {
      await api.post(`/blogs/${slug}/restore/`);
      toast.success("Post restored successfully");
      fetchData();
    } catch (err) {
      toast.error('Error restoring post');
    }
  };

  const handlePermanentDelete = async (slug) => {
    const result = await confirmModal("Delete Permanently?", "This will wipe all comments and cannot be undone!", "Yes, delete forever");
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/blogs/${slug}/permanent_delete/`);
      toast.success("Post permanently deleted");
      fetchData();
    } catch (err) {
      toast.error('Error permanently deleting post');
    }
  };

  if (loading) return <div>Loading drafts...</div>;

  return (
    <div className="flex flex-col gap-12">
      {/* Drafts Section */}
      <section className="bg-white rounded-lg shadow-sm p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-primary font-poppins">
            {isAdmin ? 'All Drafts' : 'My Drafts'}
          </h1>
          <Link href="/dashboard/compose" className="bg-primary text-white px-4 py-2 rounded font-bold hover:bg-[#008f87] transition-colors">
            <i className="fa-solid fa-plus mr-2"></i> New Draft
          </Link>
        </div>
        
        {drafts.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <p className="text-gray-500">You don't have any working drafts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.map((draft) => (
              <div key={draft.slug} className="border border-gray-200 rounded-lg overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs text-gray-500">{new Date(draft.updated_at || Date.now()).toLocaleDateString()}</p>
                    {isAdmin && <span className="text-[10px] bg-gray-100 px-1 rounded text-gray-600 font-bold">BY: {draft.author?.username}</span>}
                  </div>
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{draft.title || 'Untitled Draft'}</h3>
                  <p className="text-sm text-gray-500 line-clamp-3">
                    {draft.content ? draft.content.replace(/<[^>]+>/g, '') : 'No content yet...'}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 border-t border-gray-200 flex gap-2">
                  <Link 
                    href={`/dashboard/compose?slug=${draft.slug}`}
                    className="flex-1 text-center bg-white border border-gray-300 py-2 rounded text-sm font-bold hover:bg-gray-100 transition-colors"
                  >
                    Edit
                  </Link>
                  <Link 
                    href={`/preview/${draft.slug}`}
                    target="_blank"
                    className="flex-1 text-center bg-primary text-white py-2 rounded text-sm font-bold hover:bg-[#008f87] transition-colors"
                  >
                    Preview
                  </Link>
                  {/* Delete button: visible to admins or the post's own author */}
                  {(isAdmin || draft.author?.username === user) && (
                    <button
                      onClick={() => handleDelete(draft.slug)}
                      className="px-3 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors"
                      title="Move to Trash"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Submissions Section */}
      <section className="bg-white rounded-lg shadow-sm p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-[#b45309] font-poppins">Under Review</h1>
        </div>
        
        {submissions.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No posts are currently under review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {submissions.map((sub) => (
              <div key={sub.slug} className="border border-yellow-200 bg-yellow-50/30 rounded-lg overflow-hidden flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold px-2 py-1 rounded uppercase tracking-wide bg-yellow-100 text-yellow-800">
                      Pending
                    </span>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{new Date(sub.updated_at || Date.now()).toLocaleDateString()}</p>
                      {isAdmin && <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Author: {sub.author?.username}</p>}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{sub.title}</h3>
                </div>
                <div className="bg-white p-3 border-t border-gray-200 flex gap-2">
                  <Link 
                    href={`/dashboard/compose?slug=${sub.slug}`}
                    className="flex-1 text-center bg-gray-100 py-2 rounded text-sm font-bold hover:bg-gray-200 transition-colors"
                  >
                    Edit
                  </Link>
                  <Link 
                    href={`/preview/${sub.slug}`}
                    target="_blank"
                    className="flex-1 text-center bg-amber-500 text-white py-2 rounded text-sm font-bold hover:bg-amber-600 transition-colors"
                  >
                    Preview
                  </Link>
                  {/* Admins can trash pending submissions from any author */}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(sub.slug)}
                      className="px-3 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors"
                      title="Move to Trash"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      {/* Admin Only: Published Posts */}
      {isAdmin && (
        <section className="bg-white rounded-lg shadow-sm p-6 lg:p-8">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold text-green-700 font-poppins">Published Management</h1>
          </div>
          
          {published.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No published posts found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {published.map((p) => (
                <div key={p.slug} className="border border-green-200 bg-green-50/10 rounded-lg overflow-hidden flex flex-col">
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-bold px-2 py-1 rounded uppercase tracking-wide bg-green-100 text-green-800">
                        Published
                      </span>
                      <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">{p.title}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Author: {p.author?.username}</p>
                  </div>
                  <div className="bg-white p-3 border-t border-gray-200 flex gap-2">
                    <Link 
                      href={`/dashboard/compose?slug=${p.slug}`}
                      className="flex-1 text-center bg-white border border-gray-300 py-2 rounded text-sm font-bold hover:bg-gray-100 transition-colors"
                    >
                      Edit
                    </Link>
                    <Link 
                      href={`/preview/${p.slug}`}
                      target="_blank"
                      className="flex-1 text-center bg-gray-100 py-2 rounded text-sm font-bold hover:bg-gray-200 transition-colors"
                    >
                      Preview
                    </Link>
                    <button 
                      onClick={() => handleDelete(p.slug)}
                      className="px-3 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 transition-colors"
                      title="Move to Trash"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Admin Only: Trash Section */}
      {isAdmin && (
        <section className="bg-gray-100 rounded-lg shadow-inner p-6 lg:p-8">
          <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
            <h1 className="text-2xl font-bold text-gray-700 font-poppins">
              <i className="fa-solid fa-trash-can mr-2"></i> Trash
            </h1>
          </div>
          
          {trash.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 italic">Trash is empty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-80">
              {trash.map((t) => (
                <div key={t.slug} className="border border-gray-300 bg-white rounded-lg overflow-hidden flex flex-col">
                  <div className="p-5 flex-1 grayscale">
                    <h3 className="font-bold text-lg mb-2 line-clamp-2 text-gray-600 line-through">{t.title}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Author: {t.author?.username}</p>
                  </div>
                  <div className="bg-gray-50 p-3 border-t border-gray-200 flex gap-2">
                    <button
                      onClick={() => handleRestore(t.slug)}
                      className="flex-1 text-center bg-green-600 text-white py-2 rounded text-sm font-bold hover:bg-green-700 transition-colors"
                    >
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(t.slug)}
                      className="flex-1 text-center bg-red-600 text-white py-2 rounded text-sm font-bold hover:bg-red-700 transition-colors"
                    >
                      Delete Forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default MyDrafts;
