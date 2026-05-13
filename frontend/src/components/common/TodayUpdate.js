'use client';

import React from 'react';
import useSWR from 'swr';
import api from '@/src/components/utils/api';

const fetcher = url => api.get(url).then(res => res.data);

const TodayUpdate = () => {
  const { data: stats, error, isLoading } = useSWR('blogs/stats/', fetcher, {
    refreshInterval: 30000 // Refresh every 30 seconds for real-time feel
  });

  if (error) return null; // Hide if error or unauthorized

  const displayStats = [
    { label: 'New Post', value: stats?.new_posts },
    { label: 'Total Visitors', value: stats?.total_visitors },
    { label: 'New Subscribers', value: stats?.new_subscribers },
    { label: 'Blog Reads', value: stats?.total_views }
  ];

  return (
    <div className="grid grid-cols-2 gap-[20px] mb-[60px]">
      {displayStats.map((stat) => (
        <div key={stat.label} className="p-[25px] flex flex-col justify-center text-center bg-[#dff1f0] rounded-[12px] border border-[#bde0de] transition-all hover:shadow-md">
          <p className="font-extrabold text-[#00aaa1] text-[28px] m-0 leading-tight">
            {isLoading ? (
              <span className="opacity-20 animate-pulse">...</span>
            ) : (
              (stat.value ?? 0).toLocaleString()
            )}
          </p>
          <p className="text-[12px] m-0 text-[#555] font-bold uppercase tracking-wider mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

export default TodayUpdate;
