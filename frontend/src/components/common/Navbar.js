'use client';

import { useState, useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { store } from '@/src/components/stateManagement/store';

const NavBar = (props) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { state: { isAuthenticated, user, role, groups }, dispatch } = useContext(store);
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    dispatch({ type: 'LOGOUT' });
    router.push('/');
    setMenuOpen(false);
  };

  return (
    <nav className="flex justify-between lg:justify-around items-center bg-main-bg p-4 text-[#1e1e1e] relative">
      {/* Search Overlay */}
      {showSearch && (
        <div className="absolute inset-0 bg-white z-[200] flex items-center px-4 md:px-20 animate-in fade-in duration-300">
          <form onSubmit={handleSearch} className="flex-1 flex items-center">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories, topics, authors..." 
              className="flex-1 bg-transparent border-none text-xl md:text-2xl font-bold focus:outline-none placeholder-gray-300"
              autoFocus
            />
            <button type="submit" className="p-4 text-primary text-2xl hover:scale-110 transition-transform">
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
            <button type="button" onClick={() => setShowSearch(false)} className="p-4 text-gray-400 text-2xl hover:text-red-500 transition-colors">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </form>
        </div>
      )}

      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex items-center gap-4">
        <Link href="/" className="px-5 py-2.5 cursor-pointer font-bold hover:text-primary transition-colors">Home</Link>
        <Link href="/" className="px-5 py-2.5 cursor-pointer font-bold hover:text-primary transition-colors">About</Link>
        <Link href="/" className="px-5 py-2.5 cursor-pointer font-bold hover:text-primary transition-colors">Category</Link>
      </div>

      <div className="text-lg font-poppins font-extrabold">
        <Link href="/">
           <h3><span className="bg-primary text-white px-0.5 font-bold my-2.5 rounded">CM</span>Blog </h3>
        </Link>
      </div>

      <div className="hidden lg:flex items-center gap-4">
        <button 
          onClick={() => setShowSearch(true)}
          aria-label="Search" 
          className="cursor-pointer mx-[15px] border-none hover:scale-125 transition-transform duration-300 text-primary"
        >
          <i className="fa-solid fa-magnifying-glass"></i>
        </button>
        {(isAuthenticated && (groups.includes('editor') || groups.includes('admin') || groups.includes('contributor'))) && (
          <Link href="/dashboard/compose" aria-label="Write" className="cursor-pointer mx-[15px] border-none hover:scale-125 transition-transform duration-300 text-inherit">
            <i className="fa-solid fa-pen-to-square"></i>
          </Link>
        )}
        <div className="inline-flex">
          <button aria-label="Light mode" className="p-[5px] m-0 border-none bg-[#f1f1f1] text-primary">
            <i className="fa-regular fa-sun lumos"></i>
          </button>
          <button aria-label="Dark mode" className="p-[5px] m-0 border-none bg-primary text-white">
            <i className="fa-regular fa-moon fa-flip-horizontal"></i>
          </button>
        </div>
        {isAuthenticated ? (
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="px-4 py-2 font-bold text-primary hover:bg-[#d1e7e5] rounded transition-colors uppercase text-sm tracking-tighter">Dashboard</Link>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 font-bold bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors uppercase text-sm tracking-tighter"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 font-bold text-primary hover:bg-[#d1e7e5] rounded transition-colors uppercase text-sm tracking-tighter">Login</Link>
            <Link href="/register" className="px-4 py-2 font-bold bg-primary text-white rounded hover:bg-[#008f87] transition-colors uppercase text-sm tracking-tighter shadow-sm">Sign Up</Link>
          </div>
        )}
      </div>

      {/* ── Hamburger button (mobile only) ── */}
      <button
        className="lg:hidden bg-transparent border-none text-[1.4rem] text-primary cursor-pointer p-2 m-0 leading-none"
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        <i className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars"}`}></i>
      </button>

      {/* ── Mobile dropdown (mobile only) ── */}
      {menuOpen && (
        <div className="lg:hidden flex flex-col items-start absolute top-full left-0 w-full bg-main-bg py-2 z-[100] shadow-md">
          <Link href="/" className="w-full px-5 py-3.5 border-b border-[#d1e7e5]">Home</Link>
          <Link href="/" className="w-full px-5 py-3.5 border-b border-[#d1e7e5]">About</Link>
          <Link href="/" className="w-full px-5 py-3.5 border-b border-[#d1e7e5]">Category</Link>
          {(isAuthenticated && (groups.includes('editor') || groups.includes('admin') || groups.includes('contributor'))) && (
            <Link href="/dashboard/compose" onClick={() => setMenuOpen(false)} className="w-full px-5 py-3.5 border-b border-[#d1e7e5] font-bold text-primary">
              <i className="fa-solid fa-pen-to-square mr-2"></i> Write a Story
            </Link>
          )}
          <div className="flex w-full items-center px-5 py-3.5 border-b border-[#d1e7e5] gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2 font-bold text-primary border border-primary rounded">Dashboard</Link>
                <button onClick={handleLogout} className="flex-1 text-center py-2 font-bold bg-red-50 text-red-600 rounded">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2 font-bold text-primary border border-primary rounded">Login</Link>
                <Link href="/register" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2 font-bold bg-primary text-white rounded">Sign Up</Link>
              </>
            )}
          </div>
          <div className="flex items-center px-5 py-2.5 gap-2">
            <button 
              onClick={() => { setShowSearch(true); setMenuOpen(false); }}
              aria-label="Search" 
              className="cursor-pointer mx-[15px] border-none text-primary"
            >
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
            <div className="inline-flex">
              <button disabled aria-label="Light mode" className="p-[5px] m-0 border-none bg-[#f1f1f1] text-primary">
                <i className="fa-regular fa-sun lumos"></i>
              </button>
              <button disabled aria-label="Dark mode" className="p-[5px] m-0 border-none bg-primary text-white">
                <i className="fa-regular fa-moon fa-flip-horizontal"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;


