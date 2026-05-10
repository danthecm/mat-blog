'use client';

import axios from "axios";
import React, { useEffect, useState } from "react";
import { FEATURED_BLOG_URL } from '@/src/components/utils/urls';
import FeaturedCard from '@/src/components/common/FeaturedCard';
import PopularBlogList from '@/src/components/common/PopuplarBlogList';

const Header = () => {
  const [fetching, setFetching] = useState(true);
  const [blogList, setBlogList] = useState([]);

  useEffect(() => {
    getBlogContent();
  }, []);

  const getBlogContent = () => {
    axios
      .get(FEATURED_BLOG_URL)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
        setBlogList(data);
        setFetching(false);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[4fr_1.5fr] gap-y-8 lg:gap-x-[5rem] bg-[#f2f8f7] px-[1.5rem] py-[2rem] lg:px-[7rem] lg:py-[4rem]">
      <div className="featured">
        <h3 className="mb-[2rem] font-bold text-[clamp(1.1rem,2.5vw+0.5rem,2.2rem)] font-poppins">
          <span className="bg-[#00aaa1] text-[#e8f3f3] px-[2px] font-bold my-[10px] mx-0 mr-2">Featured</span> This Month
        </h3>
        {!fetching ? (
          <div className="max-h-[650px] overflow-y-scroll lg:pr-[6rem] scrollbar-thin">
            {blogList.map((blog) => (
              <FeaturedCard key={blog.id} blog={blog} />
            ))}
          </div>
        ) : (
          <p>NO Data Found</p>
        )}
      </div>
      <PopularBlogList />
    </section>
  );
};

export default Header;
