'use client';

import useSWR from 'swr';
import api from '@/src/components/utils/api';
import PopularPostCard from "./PopularPostCard"

const fetcher = url => api.get(url).then(res => res.data);

const PopularBlogList = () => {
    const { data, error, isLoading } = useSWR('top-blogs/', fetcher);
    const topBlogs = Array.isArray(data) ? data : (data?.results || []);

    return (
        <div className="grid grid-cols-[auto] h-[700px] m-0">
            <h3 className="mb-[2rem] font-bold text-[clamp(1.1rem,2.5vw+0.5rem,2.2rem)] font-poppins">
                <span className="bg-[#00aaa1] text-[#e8f3f3] px-[2px] font-bold my-[10px] mx-0 mr-2">Popular</span> Posted
            </h3>
            <div className="flex flex-col gap-2">
                {!isLoading && topBlogs.map((blog) => (
                    <PopularPostCard key={blog.id} blog={blog} />
                ))}
            </div>
        </div>
    );
};

export default PopularBlogList;