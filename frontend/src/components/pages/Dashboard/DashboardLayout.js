'use client';

import React, { useContext, useEffect, useState } from 'react';
import { store } from '@/src/components/stateManagement/store';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/src/components/utils/api';

import { useRole } from '@/src/components/hooks/useRole';

const DashboardLayout = ({ children }) => {
  const { user, display_name, avatar, role, groups, isAuthenticated, isHydrated, isAdmin, isEditor, dispatch } = useRole();

  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isHydrated) return; // Wait for global rehydration

    if (!isAuthenticated) {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
      } else {
        router.push('/login');
      }
    } else {
      setLoading(false);
    }
  }, [isHydrated, isAuthenticated, router]);

  // Close mobile menu on path change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-main-bg text-primary font-bold animate-pulse">Loading dashboard...</div>;
  }

  const navLinks = [
    { name: 'Dashboard',    path: '/dashboard',         icon: 'fa-solid fa-chart-line',  show: true },
    { name: 'Write a Post', path: '/dashboard/compose', icon: 'fa-solid fa-pen-nib',    show: true },
    { name: 'My Drafts',    path: '/dashboard/drafts',  icon: 'fa-solid fa-file-lines', show: true },
    { name: 'Published Posts', path: '/dashboard/published', icon: 'fa-solid fa-newspaper', show: isEditor },
    { name: 'Editor Inbox', path: '/dashboard/inbox',   icon: 'fa-solid fa-inbox',      show: isEditor },
    { name: 'Categories',   path: '/dashboard/categories', icon: 'fa-solid fa-tags',    show: isAdmin },
    { name: 'User Management', path: '/dashboard/users', icon: 'fa-solid fa-users-gear', show: isAdmin },
    { name: 'Trash',        path: '/dashboard/trash',   icon: 'fa-solid fa-trash-can',  show: isAdmin },
  ];

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    dispatch({ type: 'LOGOUT' });
    router.push('/login');
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-main-bg relative">
      
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white shadow-md sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-md">
            <i className="fa-solid fa-bolt-lightning"></i>
          </div>
          <h2 className="text-lg font-black text-gray-800 font-poppins tracking-tighter">Newsroom</h2>
        </Link>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 hover:text-primary transition-colors"
        >
          <i className={`fa-solid ${mobileMenuOpen ? 'fa-xmark' : 'fa-bars-staggered'} text-xl`}></i>
        </button>
      </header>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-50
        w-[280px] sm:w-72 h-screen bg-white shadow-2xl flex flex-col 
        transition-transform duration-300 ease-in-out border-r border-gray-100
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 sm:p-8 pb-4">
          <div className="hidden md:flex items-center justify-between mb-8">
              <Link href="/dashboard" className="flex items-center gap-2 group">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:rotate-12 transition-transform duration-300">
                  <i className="fa-solid fa-bolt-lightning text-xl"></i>
                </div>
                <h2 className="text-2xl font-black text-gray-800 font-poppins tracking-tighter">Newsroom</h2>
              </Link>
          </div>
          
          {/* Identity Section (Links to Profile) */}
          <Link href={`/author/${user}`} className="mb-4 sm:mb-8 block relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-500 rounded-2xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-primary/20">
              <div className="relative shrink-0">
                {avatar ? (
                  <img src={avatar} alt={user} className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl object-cover ring-2 ring-white shadow-md" />
                ) : (
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white text-lg sm:text-xl font-black shadow-md ring-2 ring-white">
                    {user?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="min-w-0">
                <p className="font-black text-gray-800 truncate text-xs sm:text-sm tracking-tight leading-tight mb-0.5 group-hover:text-primary transition-colors">{display_name || user}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/10">
                    {role}
                  </span>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/" className="flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 px-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-500 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all duration-300 mb-4 sm:mb-6">
            <i className="fa-solid fa-house"></i>
            Visit Website
          </Link>
        </div>
        
        <nav className="flex-1 px-6 overflow-y-auto scrollbar-thin flex flex-col gap-1.5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Navigation</p>
          {navLinks.filter(link => link.show).map(link => (
            <Link 
              key={link.name} 
              href={link.path}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group ${
                pathname === link.path 
                  ? 'bg-primary text-white shadow-xl shadow-primary/30 translate-x-1' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-primary hover:translate-x-1'
              }`}
            >
              <span className={`flex items-center justify-center w-6 transition-transform duration-300 ${pathname === link.path ? 'scale-110' : 'group-hover:scale-110'}`}>
                <i className={`${link.icon} text-lg`}></i>
              </span>
              {link.name}
            </Link>
          ))}
        </nav>
        
        <div className="p-6 border-t border-gray-50 mt-auto bg-gray-50/50">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-4 text-red-500 font-black hover:bg-red-50 rounded-2xl transition-all duration-300 group"
          >
            <span className="flex items-center justify-center w-6 group-hover:rotate-12 transition-transform">
              <i className="fa-solid fa-arrow-right-from-bracket text-lg"></i>
            </span>
            Logout
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 md:p-12 bg-main-bg/30 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
