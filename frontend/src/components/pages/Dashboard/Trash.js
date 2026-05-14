'use client';

import React, { useEffect, useState, useContext } from 'react';
import api from '@/src/components/utils/api';
import { store } from '@/src/components/stateManagement/store';
import Link from 'next/link';
import { confirmModal, toast } from '@/src/components/utils/swal';
import { useRole } from '@/src/components/hooks/useRole';

const Trash = () => {
  const [trash, setTrash] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useRole();

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const res = await api.get('/blogs/trash/');
      setTrash(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to fetch trash", err);
      toast.error("Failed to fetch trash");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchTrash();
    }
  }, [user, isAdmin]);

  const handleRestore = async (slug) => {
    try {
      await api.post(`/blogs/${slug}/restore/`);
      toast.success("Post restored successfully");
      fetchTrash();
    } catch (err) {
      toast.error('Error restoring post');
    }
  };

  const handlePermanentDelete = async (slug) => {
    const result = await confirmModal(
      "Delete Permanently?", 
      "This will wipe all comments and cannot be undone!", 
      "Yes, delete forever"
    );
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/blogs/${slug}/permanent_delete/`);
      toast.success("Post permanently deleted");
      fetchTrash();
    } catch (err) {
      toast.error('Error permanently deleting post');
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg text-center">
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p>Only administrators can manage the trash.</p>
      </div>
    );
  }

  if (loading) return <div className="p-10 text-center text-gray-500">Loading trash...</div>;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
      <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-800 font-poppins flex items-center gap-3">
            <i className="fa-solid fa-trash-can text-red-500"></i> Trash
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Restore or permanently delete removed content</p>
        </div>
        <span className="bg-red-50 text-red-600 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider border border-red-100">
          {trash.length} Items
        </span>
      </div>
      
      {trash.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
          <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-trash-can text-gray-200 text-3xl"></i>
          </div>
          <p className="text-gray-400 font-bold">Your trash is empty.</p>
          <p className="text-gray-300 text-sm">Deleted posts will appear here for final management.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trash.map((t) => (
            <div key={t.slug} className="group border border-gray-100 bg-white rounded-2xl overflow-hidden flex flex-col hover:shadow-xl hover:border-red-100 transition-all duration-300">
              <div className="p-6 flex-1 bg-gradient-to-b from-gray-50/50 to-white">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-500 rounded uppercase tracking-widest">
                    Archived
                  </span>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(t.updated_at).toLocaleDateString()}</p>
                </div>
                <h3 className="font-bold text-lg mb-2 line-clamp-2 text-gray-600 group-hover:text-gray-800 transition-colors">{t.title || 'Untitled'}</h3>
                <p className="text-[10px] text-primary font-bold uppercase flex items-center gap-1">
                  <i className="fa-solid fa-user-pen text-[8px]"></i> {t.author?.username}
                </p>
              </div>
              
              <div className="bg-gray-50/50 p-4 border-t border-gray-50 flex gap-3">
                <button
                  onClick={() => handleRestore(t.slug)}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border border-green-200 text-green-600 py-2.5 rounded-xl text-xs font-black hover:bg-green-600 hover:text-white hover:border-green-600 transition-all duration-200 shadow-sm"
                >
                  <i className="fa-solid fa-rotate-left"></i>
                  Restore
                </button>
                <button
                  onClick={() => handlePermanentDelete(t.slug)}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 py-2.5 rounded-xl text-xs font-black hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200 shadow-sm"
                >
                  <i className="fa-solid fa-fire-pill"></i>
                  Wipe
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default Trash;
