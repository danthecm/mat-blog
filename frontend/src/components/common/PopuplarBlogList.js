'use client';

import useSWR from 'swr';
import api from '@/src/components/utils/api';
import PopularPostCard from "./PopularPostCard"

const fetcher = url => api.get(url).then(res => res.data);

const PopularBlogList = () => {
    const { data, error, isLoading } = useSWR('top-blogs/', fetcher);
    const topBlogs = Array.isArray(data) ? data : (data?.results || []);

    return (
        <div className="flex flex-col m-0 min-h-[500px]">
            <h3 className="mb-[1.5rem] font-bold text-[clamp(1.1rem,2.5vw+0.5rem,1.8rem)] font-poppins">
                <span className="bg-primary text-white px-2 rounded mr-2">Popular</span> Posted
            </h3>
            <div className="flex flex-col gap-4">
                {!isLoading && topBlogs.map((blog) => (
                    <PopularPostCard key={blog.id} blog={blog} />
                ))}
                {topBlogs.length === 0 && !isLoading && (
                    <p className="text-gray-400 italic">No popular posts yet.</p>
                )}
            </div>
        </div>
    );
};

export default PopularBlogList;