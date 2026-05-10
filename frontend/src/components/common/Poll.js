'use client';

import React, { useState, useEffect } from 'react';
import api from '@/src/components/utils/api';
import { toast } from '@/src/components/utils/swal';

const Poll = ({ pollId }) => {
  const [poll, setPoll] = useState(null);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPoll = async () => {
      try {
        const res = await api.get(`polls/${pollId}/`);
        setPoll(res.data);
      } catch (err) {
        console.error("Failed to fetch poll");
      } finally {
        setLoading(false);
      }
    };
    if (pollId) fetchPoll();
  }, [pollId]);

  const handleVote = async (choiceId) => {
    try {
      await api.post(`polls/${pollId}/vote/`, { option_id: choiceId });
      setVoted(true);
      toast.success("Vote recorded successfully!");
      // Refresh poll results
      const res = await api.get(`polls/${pollId}/`);
      setPoll(res.data);
    } catch (err) {
      toast.error("Failed to cast vote");
    }
  };

  if (loading) return <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 animate-pulse h-48"></div>;
  if (!poll) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h4 className="text-sm font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
        <i className="fa-solid fa-square-poll-vertical"></i> Community Poll
      </h4>
      <h3 className="text-xl font-bold text-[#1e1e1e] mb-6 leading-tight">{poll.question}</h3>
      
      <div className="flex flex-col gap-3">
        {poll.options.map((choice) => {
          const percentage = poll.total_votes > 0 ? Math.round((choice.vote_count / poll.total_votes) * 100) : 0;
          
          return (
            <button 
              key={choice.id}
              onClick={() => !voted && handleVote(choice.id)}
              disabled={voted}
              className={`relative w-full text-left p-4 rounded-lg border transition-all overflow-hidden ${voted ? 'border-transparent bg-gray-50' : 'border-gray-200 hover:border-primary hover:bg-gray-50'}`}
            >
              {voted && (
                <div 
                  className="absolute top-0 left-0 h-full bg-[#d1e7e5] transition-all duration-1000"
                  style={{ width: `${percentage}%`, zIndex: 0 }}
                ></div>
              )}
              <div className="relative z-10 flex justify-between items-center w-full">
                <span className={`font-bold text-sm ${voted ? 'text-[#1e1e1e]' : 'text-gray-700'}`}>
                  {choice.text}
                </span>
                {voted && (
                  <span className="text-primary font-extrabold text-sm">{percentage}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      
      <p className="mt-4 text-[11px] text-gray-400 font-bold uppercase tracking-tighter">
        {poll.total_votes} Total Votes • {voted ? 'Thank you for voting!' : 'Select an option to vote'}
      </p>
    </div>
  );
};

export default Poll;
