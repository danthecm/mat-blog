import React from "react";
import Link from "next/link";
import TagsList from "./TagsList";
import { resolveImageUrl } from "@/src/components/utils/imageHelper";

const PopularPostCard = ({ blog }) => {
  return (
    <div className="grid grid-cols-[1fr_2fr] gap-x-[25px] max-w-[90%] m-0 mb-6">
      <img 
        src={resolveImageUrl(blog.cover)} 
        alt={blog.title} 
        className="w-[129px] h-[115px] bg-[#d9d9d9] rounded-[5px] object-cover" 
      />
      <div className="flex flex-col justify-center">
        <TagsList tags={blog.tags} />
        <Link href={`/${blog.slug}`}>
          <p className="text-[14px] font-[500] text-[#1e1e1e] hover:text-[#00aaa1] transition-colors line-clamp-2">
            {blog.title}
          </p>
        </Link>
        <div className="text-[10px] text-[#777777] mt-[10px]">
          <p className="uppercase tracking-wide font-bold">
            {blog.author?.display_name || blog.author?.username || 'Unknown'} | {blog.read_time || 1} MIN{blog.read_time !== 1 ? 'S' : ''} READ
          </p>
        </div>
      </div>
    </div>
  );
};

export default PopularPostCard;
