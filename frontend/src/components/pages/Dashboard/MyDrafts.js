'use client';

import React, { useEffect, useState, useContext } from 'react';
import api from '@/src/components/utils/api';
import { store } from '@/src/components/stateManagement/store';
import Link from 'next/link';

import { confirmModal, toast } from '@/src/components/utils/swal';

const MyDrafts = () => {
  const [drafts, setDrafts] = useState([]);
  const [submissions, setSubmissions] = useState([]);
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

      const results = await Promise.all(endpoints);
      
      setDrafts(results[0].data.results || results[0].data);
      setSubmissions(results[1].data.results || results[1].data);
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

  if (loading) return <div className="p-10 text-center text-gray-500">Loading drafts...</div>;

  return (
    <div className="flex flex-col gap-12">
      {/* Drafts Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
        <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-800 font-poppins">
              {isAdmin ? 'All Drafts' : 'My Drafts'}
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Unpublished work in progress</p>
          </div>
          <Link href="/dashboard/compose" className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-[#008f87] transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
            <i className="fa-solid fa-plus"></i> New Draft
          </Link>
        </div>
        
        {drafts.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-bold">No working drafts found.</p>
            <p className="text-gray-300 text-sm mt-1">Start writing something amazing today!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drafts.map((draft) => (
              <div key={draft.slug} className="group border border-gray-100 bg-white rounded-2xl overflow-hidden flex flex-col hover:shadow-xl hover:border-primary/20 transition-all duration-300">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(draft.updated_at || Date.now()).toLocaleDateString()}</p>
                    {isAdmin && <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold border border-gray-200 uppercase">BY: {draft.author?.username}</span>}
                  </div>
                  <h3 className="font-bold text-lg mb-3 line-clamp-2 text-gray-800 group-hover:text-primary transition-colors">{draft.title || 'Untitled Draft'}</h3>
                  <p className="text-sm text-gray-500 line-clamp-3 leading-relaxed mb-4">
                    {draft.content ? draft.content.replace(/<[^>]+>/g, '') : 'No content yet...'}
                  </p>
                </div>
                <div className="bg-gray-50/50 p-4 border-t border-gray-50 flex gap-2">
                  <Link 
                    href={`/dashboard/compose?slug=${draft.slug}`}
                    className="flex-1 text-center bg-white border border-gray-200 py-2 rounded-xl text-xs font-black text-gray-700 hover:bg-gray-100 transition-all"
                  >
                    Edit
                  </Link>
                  <Link 
                    href={`/preview/${draft.slug}`}
                    target="_blank"
                    className="flex-1 text-center bg-primary text-white py-2 rounded-xl text-xs font-black hover:bg-[#008f87] transition-all shadow-sm"
                  >
                    Preview
                  </Link>
                  {/* Delete button: visible to admins or the post's own author */}
                  {(isAdmin || draft.author?.username === user) && (
                    <button
                      onClick={() => handleDelete(draft.slug)}
                      className="w-10 flex items-center justify-center bg-red-50 text-red-500 border border-red-100 rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm"
                      title="Move to Trash"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Submissions Section */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
        <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
          <div>
            <h1 className="text-3xl font-black text-amber-700 font-poppins">Under Review</h1>
            <p className="text-sm text-amber-600/70 font-medium mt-1">Pending approval for publication</p>
          </div>
          <span className="bg-amber-50 text-amber-700 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider border border-amber-100">
            {submissions.length} Pending
          </span>
        </div>
        
        {submissions.length === 0 ? (
          <div className="text-center py-20 bg-amber-50/30 rounded-2xl border-2 border-dashed border-amber-100">
            <p className="text-amber-800/40 font-bold">No posts are currently under review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {submissions.map((sub) => (
              <div key={sub.slug} className="group border border-amber-100 bg-amber-50/10 rounded-2xl overflow-hidden flex flex-col hover:shadow-xl hover:border-amber-200 transition-all duration-300">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest bg-amber-100 text-amber-800 border border-amber-200">
                      Pending
                    </span>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(sub.updated_at || Date.now()).toLocaleDateString()}</p>
                      {isAdmin && <p className="text-[10px] text-amber-600 font-bold uppercase mt-1">Author: {sub.author?.username}</p>}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-4 line-clamp-2 text-gray-800 group-hover:text-amber-700 transition-colors">{sub.title}</h3>
                </div>
                <div className="bg-white/80 p-4 border-t border-amber-50 flex gap-2">
                  <Link 
                    href={`/dashboard/compose?slug=${sub.slug}`}
                    className="flex-1 text-center bg-gray-50 py-2 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-100 transition-all"
                  >
                    Edit
                  </Link>
                  <Link 
                    href={`/preview/${sub.slug}`}
                    target="_blank"
                    className="flex-1 text-center bg-amber-500 text-white py-2 rounded-xl text-xs font-black hover:bg-amber-600 transition-all shadow-sm"
                  >
                    Preview
                  </Link>
                  {/* Admins can trash pending submissions from any author */}
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(sub.slug)}
                      className="w-10 flex items-center justify-center bg-red-50 text-red-500 border border-red-100 rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all shadow-sm"
                      title="Move to Trash"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MyDrafts;
