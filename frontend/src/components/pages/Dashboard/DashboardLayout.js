'use client';

import React, { useContext, useEffect, useState } from 'react';
import { store } from '@/src/components/stateManagement/store';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/src/components/utils/api';

const DashboardLayout = ({ children }) => {
  const { state: { user, role, groups, isAuthenticated }, dispatch } = useContext(store);
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  // Helper — use groups (new) with role as fallback (backward compat)
  const inGroup = (...names) => {
    if (Array.isArray(groups) && groups.length > 0) return names.some(n => groups.includes(n));
    return role ? names.includes(role) : false; // fallback if groups not yet loaded
  };
  const isAdmin   = inGroup('admin');
  const isEditor  = inGroup('editor', 'admin');

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }
      
      if (!isAuthenticated) {
        try {
          const userRes = await api.get('users/me/');
          dispatch({
            type: 'SET_USER',
            payload: {
              user: userRes.data.username,
              role: userRes.data.role,
              groups: userRes.data.groups || [],
            }
          });
        } catch (error) {
          router.push('/login');
          return;
        }
      }
      setLoading(false);
    };
    
    checkAuth();
  }, [isAuthenticated, router, dispatch]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading dashboard...</div>;
  }

  const navLinks = [
    { name: 'Dashboard',    path: '/dashboard',         show: true },
    { name: 'Write a Post', path: '/dashboard/compose', show: true },
    { 
      name: isAdmin ? 'Content Manager' : 'My Drafts', 
      path: '/dashboard/drafts', 
      show: true 
    },
    { name: 'Editor Inbox', path: '/dashboard/inbox',   show: isEditor },
    { name: 'Categories',   path: '/dashboard/categories', show: isEditor },
    { name: 'My Profile',   path: `/author/${user}`,    show: true },
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    dispatch({ type: 'LOGOUT' });
    router.push('/login');
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-main-bg">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white shadow-md p-6 flex flex-col">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-primary font-poppins">Newsroom</h2>
            <Link href="/" className="text-xs font-bold text-gray-400 hover:text-primary transition-colors flex items-center">
                <i className="fa-solid fa-house mr-1"></i> Site
            </Link>
        </div>
        
        <div className="mb-6 pb-6 border-b border-gray-100">
          <p className="text-sm text-gray-500">Logged in as</p>
          <p className="font-bold text-[#1e1e1e]">{user}</p>
          <p className="text-xs inline-block mt-1 bg-primary text-white px-2 py-0.5 rounded capitalize">{role}</p>
        </div>
        
        <nav className="flex-1 flex flex-col gap-2">
          {navLinks.filter(link => link.show).map(link => (
            <Link 
              key={link.name} 
              href={link.path}
              className={`px-4 py-3 rounded-md text-sm font-bold transition-colors ${pathname === link.path ? 'bg-[#dff1f0] text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-primary'}`}
            >
              {link.name}
            </Link>
          ))}
        </nav>
        
        <button 
          onClick={handleLogout}
          className="mt-8 px-4 py-3 text-left text-red-600 font-bold hover:bg-red-50 rounded-md transition-colors"
        >
          <i className="fa-solid fa-arrow-right-from-bracket mr-2"></i> Logout
        </button>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
