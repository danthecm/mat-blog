'use client';

import React from "react";
import Link from "next/link";
import AuthorInfo from "./AuthorInfo";

const RecentPostCard = ({ blogs, loading }) => {
  const removeTags = (str) => {
    if (!str) return "";
    const regex = /<\/?[^>]+>/gi;
    const regex2 = /&[a-z]+;/gi;
    return str.replace(regex, "").replace(regex2, " ");
  };

  if (loading) return <div className="text-[#555]">Loading recent articles...</div>;

  return (
    <>
      {blogs && blogs.map((blog) => (
        <div className="grid grid-cols-1 mb-[2.5rem]" key={blog.id}>
          <Link href={`/${blog.slug}`} className="block">
            <img 
              src={blog.cover} 
              alt="Blog Cover" 
              className="w-full aspect-[400/250] bg-[#d9d9d9] rounded-[7px] mb-[1rem] object-cover" 
            />
            <h2 className="mb-[1rem] font-bold text-[clamp(1.1rem,2.5vw+0.5rem,2.2rem)] font-poppins text-[#1e1e1e]">
              {blog.title}
            </h2>
            <AuthorInfo
              authorName={blog.author?.username || 'Unknown'}
              dateTime={blog.created_at}
              content={removeTags(blog.content)}
            />
            <p className="mt-[15px] text-[#555] text-[clamp(0.9rem,1.5vw+0.4rem,1rem)] line-clamp-2">
              {removeTags(blog.content).substring(0, 100)}...
            </p>
          </Link>
        </div>
      ))}
    </>
  );
};

export default RecentPostCard;
