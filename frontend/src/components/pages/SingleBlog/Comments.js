'use client';

import React, { useEffect, useState, useContext } from "react";
import api from '@/src/components/utils/api';
import CommentCard from '@/src/components/common/CommentCard';
import { store } from '@/src/components/stateManagement/store';

import { toast } from '@/src/components/utils/swal';

const Comments = ({ blogId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { state: { isAuthenticated, user } } = useContext(store);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await api.get(`comments/?blog_id=${blogId}`);
      setComments(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (blogId) fetchComments();
  }, [blogId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    try {
      await api.post('comments/', {
        blog: blogId,
        content: newComment,
        author_name: isAuthenticated ? user?.username || user : "Anonymous"
      });
      setNewComment("");
      toast.success("Comment posted successfully");
      fetchComments();
    } catch (err) {
      toast.error("Failed to post comment");
    }
  };

  return (
    <div className="mt-12 bg-white p-8 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-2xl font-bold mb-6 text-gray-900 font-poppins border-b pb-4">Discussion</h3>
      
      <form onSubmit={handleSubmit} className="mb-10">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts..."
          className="w-full p-4 border border-gray-200 rounded-lg focus:outline-none focus:border-primary min-h-[120px] mb-4 text-gray-800"
          required
        ></textarea>
        <button 
          type="submit"
          className="bg-primary text-white px-6 py-2.5 rounded-md font-bold hover:bg-[#008f87] transition-all shadow-sm"
        >
          Post Comment
        </button>
      </form>

      <div className="flex flex-col gap-8">
        {loading && comments.length === 0 ? (
          <p className="text-gray-500">Loading discussion...</p>
        ) : comments.length === 0 ? (
          <p className="text-gray-500 italic">No comments yet. Be the first to share your thoughts!</p>
        ) : (
          comments.map(comment => (
            <CommentCard 
              key={comment.id} 
              comment={comment} 
              onReply={fetchComments}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;
