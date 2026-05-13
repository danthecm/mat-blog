'use client';

import React, { useEffect, useState, useContext } from 'react';
import api from '@/src/components/utils/api';
import { store } from '@/src/components/stateManagement/store';
import Swal from 'sweetalert2';
import LoadingSpinner from '@/src/components/common/LoadingSpinner';

const AuthorProfile = ({ username }) => {
  const { state: { user: currentUser } } = useContext(store);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isOwnProfile = currentUser === username;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`users/${username}/`);
        setProfile(res.data);
        setBio(res.data.profile?.bio || '');
        setWebsite(res.data.profile?.website || '');
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch('users/me/', { bio, website });
      setProfile({
        ...profile,
        profile: {
          ...profile.profile,
          bio,
          website
        }
      });
      setIsEditing(false);
      Swal.fire({
        icon: 'success',
        title: 'Profile Updated',
        showConfirmButton: false,
        timer: 1500
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.response?.data?.error || 'Could not update profile.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading profile..." />;
  if (error) return <div className="min-h-[50vh] flex items-center justify-center text-red-600">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-100 relative">
        {isOwnProfile && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="absolute top-6 right-6 text-xs font-bold uppercase text-primary hover:underline"
          >
            <i className="fa-solid fa-pen-to-square mr-1"></i> Edit Profile
          </button>
        )}

        <div className="w-32 h-32 mx-auto bg-gray-200 rounded-full mb-6 flex items-center justify-center text-4xl text-gray-500 font-bold uppercase overflow-hidden border-4 border-gray-50">
          {profile.profile?.avatar ? (
            <img src={profile.profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            profile.username.charAt(0)
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.username}</h1>
        <p className="text-sm font-bold text-primary uppercase tracking-wider mb-6">{profile.role}</p>
        
        {isEditing ? (
          <div className="max-w-2xl mx-auto text-left space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Bio</label>
              <textarea 
                className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                rows="4"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Website URL</label>
              <input 
                type="url"
                className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <button 
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 border rounded-md text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 bg-primary text-white rounded-md text-sm font-bold hover:bg-opacity-90 transition-colors flex items-center"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin mr-2"></i> Saving...
                  </>
                ) : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6 italic">
              {profile.profile?.bio || `This author hasn't added a bio yet.`}
            </p>
            
            {profile.profile?.website && (
              <a href={profile.profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold text-sm inline-flex items-center">
                <i className="fa-solid fa-link mr-2"></i> {(() => {
                  try {
                    return new URL(profile.profile.website).hostname;
                  } catch (e) {
                    return profile.profile.website.replace(/^https?:\/\//, '').split('/')[0];
                  }
                })()}
              </a>
            )}
          </>
        )}
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 border-b pb-4">
          Posts by <span className="text-primary">{profile.username}</span>
        </h2>
        <AuthorPosts username={profile.username} />
      </div>
    </div>
  );
};

const AuthorPosts = ({ username }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // Explicitly filter for published posts so drafts aren't leaked on the public profile
        const res = await api.get(`blogs/?author__username=${username}&status=published`);
        setPosts(res.data.results || res.data || []);
      } catch (err) {
        console.error("Failed to fetch author posts", err);
      } finally {
        setLoading(false);
      }
    };
    if (username) fetchPosts();
  }, [username]);

  if (loading) return <LoadingSpinner text="Loading posts..." />;
  if (posts.length === 0) return <div className="text-center py-10 text-gray-400 italic">No posts published yet.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {posts.map(post => (
        <a key={post.id} href={`/${post.slug}`} className="group block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
          <div className="h-48 overflow-hidden bg-gray-100">
            <img 
              src={post.cover} 
              alt={post.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="p-5">
            <p className="text-xs font-bold text-primary mb-2 uppercase tracking-wide">
              {post.category?.name || 'Uncategorized'}
            </p>
            <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary transition-colors">
              {post.title}
            </h3>
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              <span><i className="fa-solid fa-eye mr-1"></i> {post.view_count || 0}</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

export default AuthorProfile;
