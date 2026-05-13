import React from "react";
import Link from "next/link";
import { resolveImageUrl } from "@/src/components/utils/imageHelper";

import TagsList from "./TagsList";
import AuthorInfo from "./AuthorInfo";


const FeaturedCard = ({ blog }) => {
  if (!blog) return null;

  const removeTags = (str) => {
    if (!str) return "";
    const regex = /<\/?[^>]+>/gi;
    const regex2 = /&[a-z]+;/gi;
    return str.replace(regex, "").replace(regex2, " ");
  };

  const text = removeTags(blog.content);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-[25px] bg-white p-[2rem] mb-[1rem] rounded-[5px] shadow-[7px_7px_5px_#d9d9d9] border-[2px] border-[#f1f1f1]">
      <img 
        src={resolveImageUrl(blog.cover)}
        alt="Blog Cover" 
        className="w-full aspect-[340/240] bg-[#d9d9d9] rounded-[7px] object-cover" 
      />
      <div className="grid grid-cols-1 gap-[12px] content-start">
        <div className="mb-[5px]">
          <TagsList tags={blog.tags} />
        </div>
        <h2 className="font-bolder text-[#222222] font-poppins text-2xl mb-1 line-clamp-2">
          {blog.title}
        </h2>
        <AuthorInfo
          authorName={blog.author?.username}
          dateTime={blog.created_at}
          content={text}
        />
        <p className="text-[15px] text-[#555555] leading-relaxed line-clamp-3">
          {text.substring(0, 70)}
          {text.length > 70 && "...."}
        </p>
        <Link className="justify-self-end mt-auto" href={`/${blog.slug}`}>
          <button className="text-[15px] rounded-[20px] p-[0.5em] bg-[#00aaa1] text-[#f1f1f1] font-bolder max-w-[160px] h-[36px] min-w-[100px] hover:scale-105 transition-transform">
            Read More
          </button>
        </Link>
      </div>
    </div>
  );
};

export default FeaturedCard;
