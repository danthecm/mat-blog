'use client';

import React, { useState } from "react";
import moment from "moment";
import api from '@/src/components/utils/api';
import { toast } from '@/src/components/utils/swal';

const CommentCard = ({ comment, onReply, depth = 0 }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  
  const replies = comment.replies || [];

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    
    try {
      await api.post('comments/', {
        blog: comment.blog,
        content: replyContent,
        parent: comment.id,
        author_name: "Anonymous"
      });
      setReplyContent("");
      setShowReplyForm(false);
      toast.success("Reply posted successfully");
      onReply();
    } catch (err) {
      toast.error("Failed to post reply");
    }
  };

  return (
    <div className={`flex flex-col ${depth > 0 ? 'ml-6 mt-4 border-l-2 border-[#d1e7e5] pl-6' : ''}`}>
      <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 transition-all hover:shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-bold uppercase text-base shadow-sm">
            {(comment.author_name || 'A').charAt(0)}
          </div>
          <div>
            <p className="font-bold text-[#1e1e1e] text-sm uppercase tracking-tight">{comment.author_name || 'Anonymous'}</p>
            <p className="text-[11px] text-gray-400 font-medium">{moment(comment.created_at).fromNow()}</p>
          </div>
        </div>
        <p className="text-gray-700 text-[14px] leading-relaxed mb-4">
          {comment.content}
        </p>
        
        <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-primary text-[12px] font-extrabold hover:text-[#008f87] flex items-center gap-1.5 transition-colors"
            >
              <i className="fa-solid fa-reply"></i> {showReplyForm ? 'CANCEL' : 'REPLY'}
            </button>
        </div>

        {showReplyForm && (
          <form onSubmit={handleReplySubmit} className="mt-5 flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <input 
              type="text" 
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary bg-white shadow-inner"
              autoFocus
            />
            <button 
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#008f87] transition-all"
            >
              POST
            </button>
          </form>
        )}
      </div>

      {replies.length > 0 && (
        <div className="flex flex-col">
          {replies.map(reply => (
            <CommentCard 
              key={reply.id} 
              comment={reply} 
              onReply={onReply} 
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentCard;