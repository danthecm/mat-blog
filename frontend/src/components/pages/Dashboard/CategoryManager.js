'use client';

import React, { useState, useEffect } from 'react';
import { store } from '@/src/components/stateManagement/store';
import { useContext } from 'react';
import api from '@/src/components/utils/api';
import { toast, confirmModal } from '@/src/components/utils/swal';
import LoadingSpinner from '@/src/components/common/LoadingSpinner';

const CategoryManager = () => {
  const { state: { role, groups } } = useContext(store);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const inGroup = (...names) => {
    if (Array.isArray(groups) && groups.length > 0) return names.some(n => groups.includes(n));
    return role ? names.includes(role) : false;
  };
  const isAdmin = inGroup('admin');
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await api.get('blog-categories/');
      setCategories(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('blog-categories/', { name, description });
      toast.success('Category created');
      setName('');
      setDescription('');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (slug, categoryName) => {
    const result = await confirmModal('Delete Category?', `Are you sure you want to delete "${categoryName}"? This might affect posts in this category.`, 'Yes, Delete', 'Cancel');
    if (!result.isConfirmed) return;
    
    try {
      await api.delete(`blog-categories/${slug}/`);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg text-center">
        <h2 className="text-xl font-bold mb-2">Access Denied</h2>
        <p>You do not have permission to manage categories. This section is restricted to administrators.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-primary font-poppins">
          Manage Categories
        </h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Create Form */}
        <div className="lg:col-span-1 bg-gray-50 p-6 rounded-lg border border-gray-200 h-fit">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Create New</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Name *</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Technology"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary bg-white resize-none"
              ></textarea>
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting || !name.trim()}
              className="bg-primary text-white py-2 rounded font-bold hover:bg-[#008f87] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? 'Creating...' : 'Create Category'}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          {loading ? (
            <LoadingSpinner size="sm" text="Loading categories..." />
          ) : categories.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              No categories found. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="pb-3 pr-4 font-bold text-gray-500 uppercase tracking-wide text-xs">Name</th>
                    <th className="pb-3 pr-4 font-bold text-gray-500 uppercase tracking-wide text-xs">Slug</th>
                    <th className="pb-3 pr-4 font-bold text-gray-500 uppercase tracking-wide text-xs">Description</th>
                    <th className="pb-3 font-bold text-gray-500 uppercase tracking-wide text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.slug} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-4 pr-4 font-bold text-gray-800">{cat.name}</td>
                      <td className="py-4 pr-4 font-mono text-xs text-gray-500 bg-gray-100 px-2 rounded inline-block mt-3 mb-1">{cat.slug}</td>
                      <td className="py-4 pr-4 text-gray-600 line-clamp-2 max-w-[200px]">{cat.description || <span className="text-gray-400 italic">None</span>}</td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => handleDelete(cat.slug, cat.name)}
                          className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded transition-colors"
                          title="Delete Category"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
