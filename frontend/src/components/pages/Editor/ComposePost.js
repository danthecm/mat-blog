'use client';

import React, { useState, useEffect, useRef } from 'react';
import CreatableSelect from 'react-select/creatable';
import RichTextEditor from './RichTextEditor';
import api from '@/src/components/utils/api';

const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? '#00a99d' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #00a99d' : 'none',
    borderRadius: '4px',
    minHeight: '42px',
    fontSize: '14px',
    '&:hover': { borderColor: '#00a99d' },
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: '#dff1f0',
    borderRadius: '4px',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: '#00a99d',
    fontWeight: '600',
    fontSize: '12px',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: '#00a99d',
    ':hover': { backgroundColor: '#00a99d', color: 'white' },
  }),
  placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '14px' }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#00a99d' : state.isFocused ? '#dff1f0' : 'white',
    color: state.isSelected ? 'white' : '#374151',
    fontSize: '14px',
    cursor: 'pointer',
  }),
  menu: (base) => ({ ...base, zIndex: 50 }),
};

const selectStylesDisabled = {
  ...selectStyles,
  control: (base) => ({
    ...selectStyles.control(base, {}),
    backgroundColor: '#f3f4f6',
    cursor: 'not-allowed',
    borderColor: '#d1d5db',
  }),
};

const createTagOnServer = async (label) => {
  const res = await api.post('blog-tags/', { title: label });
  return res.data.id;
};
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmModal, toast } from '@/src/components/utils/swal';

const ComposePost = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [slug, setSlug] = useState(null);
  const [status, setStatus] = useState('Drafting...');
  const [scheduledDate, setScheduledDate] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [blogStatus, setBlogStatus] = useState('draft'); // real status from DB
  const [coverPreview, setCoverPreview] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagOptions, setTagOptions] = useState([]);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const slugFromUrl = searchParams.get('slug');
  const saveTimeoutRef = useRef(null);
  const savingRef = useRef(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30000); // default 30s
  
  const resolveTagIds = async () => {
    // Resolve all new tags at once to avoid state interleaving issues
    const resolvedTags = await Promise.all(selectedTags.map(async (opt) => {
      if (opt.__isNew__) {
        try {
          const newId = await createTagOnServer(opt.label);
          return { value: newId, label: opt.label, __isNew__: false };
        } catch {
          toast.error(`Failed to create tag "${opt.label}"`);
          return null;
        }
      }
      return opt;
    }));

    const validTags = resolvedTags.filter(t => t !== null);
    setSelectedTags(validTags);
    return validTags.map(t => t.value);
  };

  // Save Draft Helper
  const saveDraft = async () => {
    if (savingRef.current) return slug;
    savingRef.current = true;
    try {
      const tagIds = await resolveTagIds();

      const payload = {
        title,
        content,
        scheduled_for: scheduledDate || null,
        category_id: category || null,
        tag_ids: tagIds,
      };

      let currentSlug = slug;
      if (!slug) {
        // Create new draft using FormData if cover exists
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        if (scheduledDate) formData.append('scheduled_for', scheduledDate);
        if (category) formData.append('category_id', category);
        if (coverFile) formData.append('cover', coverFile);
        tagIds.forEach((id) => formData.append('tag_ids', id));

        const res = await api.post('blogs/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        currentSlug = res.data.slug;
        setSlug(currentSlug);
        setBlogStatus(res.data.status);
        setCoverPreview(res.data.cover);
        setCoverFile(null);
        setStatus('Saved');
      } else {
        // Update existing draft
        await api.patch(`blogs/${slug}/`, payload);
        setStatus('Saved');
      }
      return currentSlug;
    } catch (err) {
      setStatus('Error saving draft');
      throw err;
    } finally {
      savingRef.current = false;
    }
  };

  const handleSaveAndExit = async () => {
    try {
      setStatus('Saving...');
      await saveDraft();
      toast.success("Draft saved successfully");
      router.push('/dashboard/drafts');
    } catch (err) {
      toast.error("Failed to save draft");
    }
  };

  // Fetch categories on mount
  useEffect(() => {
    const init = async () => {
      // 1. Fetch categories and tags
      try {
        const [catRes, tagRes] = await Promise.all([
          api.get('blog-categories/'),
          api.get('blog-tags/')
        ]);
        setCategories(catRes.data.results || catRes.data);
        const opts = (tagRes.data.results || tagRes.data).map((t) => ({
          value: t.id,
          label: t.title,
        }));
        setTagOptions(opts);
      } catch (err) {
        console.error("Failed to fetch categories / tags");
      }

      // 2. Fetch blog if editing
      if (slugFromUrl) {
        try {
          const blogRes = await api.get(`blogs/${slugFromUrl}/`);
          const blog = blogRes.data;
          setTitle(blog.title);
          setContent(blog.content);
          setCategory(blog.category?.id ? String(blog.category.id) : '');
          setScheduledDate(blog.published_at ? new Date(blog.published_at).toISOString().slice(0, 16) : '');
          setSlug(blog.slug);
          setBlogStatus(blog.status);
          setCoverPreview(blog.cover);
          if (blog.tags?.length) {
            setSelectedTags(blog.tags.map((t) => ({ value: t.id, label: t.title })));
          }
          setStatus('Ready to edit');
        } catch (err) {
          console.error("Failed to fetch blog details");
          setStatus('Error loading post');
        }
      }
    };
    init();
  }, [slugFromUrl]);

  // Auto-Save effect
  useEffect(() => {
    if (!title && !content) return;
    if (blogStatus === 'pending') return;

    // Set status to indicate changes are pending
    if (status !== 'Error saving draft') {
      setStatus('Unsaved Changes');
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setStatus('Saving...');
      await saveDraft();
    }, autoSaveInterval);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [title, content, scheduledDate, category, selectedTags, slug, blogStatus, autoSaveInterval]);

  const handleSubmitForReview = async () => {
    if (!slug) {
      toast.error("Please wait for draft to save");
      return;
    }

    const result = await confirmModal("Submit for Review?", "This will lock the post from editing until an editor reviews it.");
    if (!result.isConfirmed) return;
    
    try {
      setStatus('Submitting...');
      await api.post(`newsroom/blogs/${slug}/submit/`);
      setBlogStatus('pending');
      toast.success("Successfully submitted for review!");
      router.push('/dashboard/drafts');
    } catch (err) {
      toast.error("Error submitting for review");
      setStatus('Saved');
    }
  };

  const handleRecall = async () => {
    const result = await confirmModal("Recall Submission?", "This will move the post back to your drafts and you will be able to edit it again.");
    if (!result.isConfirmed) return;

    try {
      setStatus('Recalling...');
      await api.post(`newsroom/blogs/${slug}/recall/`);
      setBlogStatus('draft');
      setStatus('Ready to edit');
      toast.success("Submission recalled. You can now edit the draft.");
    } catch (err) {
      toast.error("Error recalling submission");
    }
  };

  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCoverPreview(URL.createObjectURL(file));
    setCoverFile(file);

    // If slug exists, upload immediately to avoid waiting for text changes
    if (slug) {
      const formData = new FormData();
      formData.append('cover', file);
      try {
        setStatus('Saving image...');
        const res = await api.patch(`blogs/${slug}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setCoverPreview(res.data.cover);
        setCoverFile(null); // Clear once uploaded
        setStatus('Saved');
      } catch (err) {
        setStatus('Error saving image');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-primary font-poppins">
          {blogStatus === 'pending' ? 'Post Under Review' : 'Write a Post'}
        </h1>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 mr-4 border-r pr-4 border-gray-200">
            <label className="text-[10px] font-bold uppercase text-gray-400">Auto-save:</label>
            <select 
              value={autoSaveInterval} 
              onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
              disabled={blogStatus === 'pending'}
              className="text-xs font-bold text-gray-600 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value={5000}>5 Seconds</option>
              <option value={15000}>15 Seconds</option>
              <option value={30000}>30 Seconds</option>
              <option value={60000}>1 Minute</option>
              <option value={300000}>5 Minutes</option>
            </select>
          </div>

          <span className={`text-sm font-bold ${status === 'Saved' || status === 'Ready to edit' ? 'text-green-600' : status === 'Unsaved Changes' ? 'text-amber-500' : 'text-gray-500'}`}>
            {status}
          </span>

          {blogStatus !== 'pending' && (
            <button 
              onClick={handleSaveAndExit}
              className="hidden sm:block bg-white text-primary border border-primary px-4 py-2 rounded-md font-bold hover:bg-gray-50 transition-colors"
            >
              Save & Return
            </button>
          )}

          {blogStatus === 'pending' ? (
            <button 
              onClick={handleRecall}
              className="bg-red-600 text-white px-4 py-2 rounded-md font-bold hover:bg-red-700 transition-colors"
            >
              Recall from Review
            </button>
          ) : (
            <button 
              onClick={handleSubmitForReview}
              className="bg-primary text-white px-4 py-2 rounded-md font-bold hover:bg-[#008f87] transition-colors"
            >
              Submit for Review
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {/* Cover Photo Section */}
        <div className="w-full">
          <label className="block text-sm font-bold text-gray-700 mb-2">Cover Photo</label>
          <div className={`relative w-full h-64 md:h-80 bg-gray-100 rounded-lg overflow-hidden border-2 border-dashed border-gray-300 flex flex-col items-center justify-center ${blogStatus === 'pending' ? 'opacity-70' : ''}`}>
            {coverPreview ? (
              <>
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                {blogStatus !== 'pending' && (
                  <label className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm text-primary px-4 py-2 rounded shadow-lg cursor-pointer font-bold hover:bg-white transition-all">
                    Change Photo
                    <input type="file" className="hidden" accept="image/*" onChange={handleCoverChange} />
                  </label>
                )}
              </>
            ) : (
              <>
                <i className="fa-regular fa-image text-5xl text-gray-400 mb-4"></i>
                <label className={`bg-primary text-white px-6 py-2 rounded font-bold cursor-pointer hover:bg-[#008f87] transition-all ${blogStatus === 'pending' ? 'pointer-events-none' : ''}`}>
                  Upload Cover Photo
                  <input type="file" className="hidden" accept="image/*" onChange={handleCoverChange} disabled={blogStatus === 'pending'} />
                </label>
                <p className="text-xs text-gray-500 mt-3 uppercase tracking-widest font-bold">Recommended: 1200 x 630 px</p>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={blogStatus === 'pending'}
            placeholder="Enter an engaging title..."
            className={`w-full px-4 py-3 text-lg border border-gray-300 rounded focus:outline-none focus:border-primary ${blogStatus === 'pending' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              disabled={blogStatus === 'pending'}
              className={`w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary bg-white ${blogStatus === 'pending' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Schedule Publishing (Optional)</label>
            <input 
              type="datetime-local" 
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              disabled={blogStatus === 'pending'}
              className={`w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary ${blogStatus === 'pending' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Tags
            <span className="ml-2 text-xs font-normal text-gray-400">Select existing or type to create new</span>
          </label>
          <CreatableSelect
            isMulti
            isDisabled={blogStatus === 'pending'}
            options={tagOptions}
            value={selectedTags}
            onChange={setSelectedTags}
            styles={blogStatus === 'pending' ? selectStylesDisabled : selectStyles}
            placeholder="e.g. JavaScript, Design, Tutorial..."
            formatCreateLabel={(val) => (
              <span>
                <i className="fa-solid fa-plus mr-1" />
                Create tag "{val}"
              </span>
            )}
            noOptionsMessage={() => 'Type to search or create a tag'}
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Content</label>
          <RichTextEditor value={content} onChange={setContent} readOnly={blogStatus === 'pending'} />
        </div>
      </div>
    </div>
  );
};

export default ComposePost;
