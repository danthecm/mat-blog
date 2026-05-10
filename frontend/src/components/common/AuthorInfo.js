import React from "react";

const AuthorInfo = ({ authorName, dateTime, content }) => {
  return (
    <div className="text-[12px] text-[#777777] mb-[15px] flex items-center gap-1 uppercase font-bold tracking-wider">
      <p className="flex items-center">
        <i className="fa-regular fa-user text-[#666666] mx-[5px]"></i> {authorName} 
      </p>
      <span>|</span>
      <p className="flex items-center">
        <i className="fa-regular fa-calendar text-[#666666] mx-[5px]"></i> {new Date(dateTime).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
      </p>
      <span>|</span>
      <p className="flex items-center">
        <i className="fa-regular fa-clock text-[#666666] mx-[5px]"></i> 5 mins read
      </p>
    </div>
  );
};

export default AuthorInfo;