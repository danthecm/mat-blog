import React from "react";

const AuthorCard = ({ author }) => {
  const avatar = author?.profile?.profile_picture || "https://clipground.com/images/img_avatar-png-2.png";
  const name = author?.username || "John Doe";
  const bio = author?.profile?.bio || "Fashion Designer, Full Stack Developer";

  return (
    <div className="grid grid-cols-[120px_auto] my-[25px]">
      <div 
        className="w-[100px] h-[100px] rounded-full bg-[#d9d9d9] self-center bg-contain bg-center bg-no-repeat shadow-sm"
        style={{ backgroundImage: `url("${avatar}")` }}
      ></div>
      <div>
        <h3 className="my-[5px] text-[20px] font-bold text-[#1e1e1e]">
          {name}
        </h3>
        <p className="text-xs my-[5px] text-[#777777] line-clamp-2">
          {bio}
        </p>
        <div className="flex flex-wrap mt-[5px]">
          {['facebook-square', 'twitter', 'instagram'].map(icon => (
            <button key={icon} className="m-[5px] bg-transparent border-none cursor-pointer group">
              <i className={`fa-brands fa-${icon} p-[5px_6px] rounded-[5px] text-[#666666] bg-[#fff] shadow-[1px_1px_2px_2px_#e5e5e5] group-hover:text-white group-hover:bg-[#00aaa1] transition-colors`}></i>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthorCard;
