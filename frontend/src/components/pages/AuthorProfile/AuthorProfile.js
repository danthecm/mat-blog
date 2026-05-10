'use client';

import React, { useEffect, useState } from 'react';
import api from '@/src/components/utils/api';
import RecentPostCard from '@/src/components/common/RecentPostCard'; // We'll adapt this later to take props

const AuthorProfile = ({ username }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`users/${username}/`);
        setProfile(res.data);
      } catch (err) {
        setError('Author not found.');
      } finally {
        setLoading(false);
      }
    };
    if (username) {
      fetchProfile();
    }
  }, [username]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center">Loading profile...</div>;
  if (error) return <div className="min-h-[50vh] flex items-center justify-center text-red-600">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100">
        <div className="w-32 h-32 mx-auto bg-gray-200 rounded-full mb-6 flex items-center justify-center text-4xl text-gray-500 font-bold uppercase overflow-hidden">
          {profile.profile_picture ? (
            <img src={profile.profile_picture} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            profile.username.charAt(0)
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.username}</h1>
        <p className="text-sm font-bold text-primary uppercase tracking-wider mb-4">{profile.role}</p>
        <p className="text-gray-600 max-w-2xl mx-auto mb-6">
          {profile.bio || `This author hasn't added a bio yet.`}
        </p>
        
        {profile.website && (
          <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">
            <i className="fa-solid fa-link mr-2"></i> Personal Website
          </a>
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6 border-b pb-2">Articles by {profile.username}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* We assume blogs will be passed as props to RecentPostCard or fetched here */}
          <RecentPostCard />
        </div>
      </div>
    </div>
  );
};

export default AuthorProfile;
