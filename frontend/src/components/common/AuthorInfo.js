import React from "react";

const AuthorInfo = ({ authorName, dateTime, content }) => {
  const calculateReadingTime = (text) => {
    if (!text) return 0;
    const wordsPerMinute = 200;
    // Remove HTML tags to get plain text word count
    const cleanText = text.replace(/<[^>]*>/g, '');
    const words = cleanText.trim().split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  };

  const readingTime = calculateReadingTime(content);

  return (
    <div className="text-[10px] text-[#777777] mb-[15px] flex items-center gap-1 uppercase font-bold tracking-wider">
      <p className="flex items-center">
        <i className="fa-regular fa-user text-[#666666] mx-[5px]"></i> {authorName} 
      </p>
      <span>|</span>
      <p className="flex items-center">
        <i className="fa-regular fa-calendar text-[#666666] mx-[5px]"></i> {new Date(dateTime).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
      </p>
      <span>|</span>
      <p className="flex items-center">
        <i className="fa-regular fa-clock text-[#666666] mx-[5px]"></i> {readingTime || 1} {readingTime === 1 ? 'min' : 'mins'} read
      </p>
    </div>
  );
};


export default AuthorInfo;