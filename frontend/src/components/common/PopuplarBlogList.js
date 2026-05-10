'use client';

import axios from "axios";
import React, { useEffect, useState } from "react";
import PopularPostCard from "./PopularPostCard"
import { TOP_BLOGS } from '@/src/components/utils/urls';

const PopularBlogList = () => {
    const [fetching, setFetching] = useState(true)
    const [topBlogs, setTopBlogs] = useState([])

    useEffect(() => {
        const getTopBlog = async () => {
            setFetching(true);
            try {
                const res = await axios.get(TOP_BLOGS);
                const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
                setTopBlogs(data);
            } catch (err) {
                console.log(err);
            } finally {
                setFetching(false);
            }
        };
        getTopBlog();
    }, []);

    return (
        <div className="grid grid-cols-[auto] h-[700px] m-0">
            <h3 className="mb-[2rem] font-bold text-[clamp(1.1rem,2.5vw+0.5rem,2.2rem)] font-poppins">
                <span className="bg-[#00aaa1] text-[#e8f3f3] px-[2px] font-bold my-[10px] mx-0 mr-2">Popular</span> Posted
            </h3>
            <div className="flex flex-col gap-2">
                {!fetching && topBlogs.map((blog) => (
                    <PopularPostCard key={blog.id} blog={blog} />
                ))}
            </div>
        </div>
    );
};

export default PopularBlogList;