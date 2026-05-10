'use client';

import React, { useEffect, useState } from 'react';
import api from '@/src/components/utils/api';
import Link from 'next/link';
import { promptModal, toast } from '@/src/components/utils/swal';

const EditorInbox = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInbox = async () => {
      try {
        const res = await api.get('/newsroom/inbox/');
        // The API might return notifications wrapping the blog, or the blog directly
        setSubmissions(res.data.results || res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInbox();
  }, []);

  const handleAction = async (slug, action) => {
    try {
      if (action === 'publish') {
        await api.post(`/newsroom/blogs/${slug}/publish/`);
        toast.success("Blog published successfully!");
      } else {
        const result = await promptModal("Reject Submission", "Enter a rejection note for the author (optional):", "Explain why this post needs changes...");
        if (!result.isConfirmed) return;
        const note = result.value;
        await api.post(`/newsroom/blogs/${slug}/reject/`, { editorial_note: note });
        toast.success("Blog rejected and returned to author");
      }
      // Refresh list
      const res = await api.get('/newsroom/inbox/');
      setSubmissions(res.data.results || res.data);
    } catch (err) {
      toast.error(`Error trying to ${action} blog.`);
    }
  };

  if (loading) return <div>Loading inbox...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-primary font-poppins mb-6">Editor Inbox</h1>
      
      {submissions.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No pending submissions at the moment. You're all caught up!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {submissions.map((sub) => {
            const blog = sub.blog || sub; // Handling difference if the API returns notifications or blogs
            return (
              <div key={blog.slug} className="border border-gray-200 rounded-lg p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{blog.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">By {blog.author?.username || 'Unknown'} • Submitted recently</p>
                  <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wide">
                    Pending Review
                  </span>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Link 
                    href={`/${blog.slug}`} 
                    target="_blank"
                    className="flex-1 text-center bg-gray-100 text-gray-700 px-4 py-2 rounded font-bold hover:bg-gray-200 transition-colors"
                  >
                    Preview
                  </Link>
                  <button 
                    onClick={() => handleAction(blog.slug, 'publish')}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleAction(blog.slug, 'reject')}
                    className="flex-1 bg-red-100 text-red-600 px-4 py-2 rounded font-bold hover:bg-red-200 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EditorInbox;
