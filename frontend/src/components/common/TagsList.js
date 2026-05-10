import React from "react";
import { useRouter } from "next/navigation";

const TagsList = ({ tags }) => {
  const router = useRouter();
  if (!tags || tags.length === 0) return null;
  return (
    <div>
      {tags.map((tag) => (
        <span 
          key={tag.title} 
          onClick={() => router.push(`/search?q=${tag.title}`)}
          className="inline-block bg-[#dff1f0] text-[#666666] max-w-fit px-[0.5rem] py-[0.2rem] text-[10px] m-[0_0.2rem_15px_0] uppercase tracking-wider cursor-pointer hover:bg-primary hover:text-white transition-colors"
        >
          {tag.title}
        </span>
      ))}
    </div>
  );
};

export default TagsList;
