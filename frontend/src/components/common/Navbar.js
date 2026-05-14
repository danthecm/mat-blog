'use client';

import { useState, useContext, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { store } from '@/src/components/stateManagement/store';

const NavBar = (props) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const { state: { isAuthenticated, user, role, groups }, dispatch } = useContext(store);
  const router = useRouter();
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Handle scroll lock for body when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  // Handle scroll for navbar shadow/blur
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const NavLink = ({ href, children, icon, onClick }) => (
    <Link 
      href={href} 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 hover:bg-primary/10 ${pathname === href ? 'text-primary' : 'text-gray-700 hover:text-primary'}`}
    >
      {icon && <i className={`fa-solid ${icon}`}></i>}
      <span>{children}</span>
    </Link>
  );

  return (
    <>
      <nav className={`sticky top-0 w-full z-[100] transition-all duration-300 ${isScrolled ? 'bg-main-bg/90 backdrop-blur-md shadow-sm py-2' : 'bg-main-bg py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
          
          {/* Search Overlay */}
          {showSearch && (
            <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[210] flex items-center px-4 md:px-20 animate-in fade-in zoom-in duration-300">
              <form onSubmit={handleSearch} className="max-w-4xl mx-auto w-full flex items-center gap-4">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stories, topics, authors..." 
                  className="flex-1 bg-transparent border-b-2 border-primary/30 text-2xl md:text-4xl font-bold focus:outline-none focus:border-primary placeholder-gray-300 py-4"
                  autoFocus
                />
                <button type="submit" className="text-primary text-3xl hover:scale-110 transition-transform p-2">
                  <i className="fa-solid fa-magnifying-glass"></i>
                </button>
                <button type="button" onClick={() => setShowSearch(false)} className="text-gray-400 text-3xl hover:text-red-500 transition-colors p-2">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </form>
            </div>
          )}

          {/* ── Left Section (Desktop) ── */}
          <div className="hidden lg:flex items-center gap-1">
            <NavLink href="/" icon="fa-house">Home</NavLink>
            <NavLink href="/category" icon="fa-layer-group">Categories</NavLink>
          </div>

          {/* ── Logo Section ── */}
          <Link href="/" className="group flex items-center gap-1">
            <div className="bg-primary text-white p-1.5 rounded-lg shadow-sm group-hover:rotate-12 transition-transform duration-300">
              <span className="font-bold text-xl leading-none">CM</span>
            </div>
            <span className="text-2xl font-poppins font-extrabold tracking-tight text-[#1e1e1e]">
              Blog
            </span>
          </Link>

          {/* ── Right Section (Desktop) ── */}
          <div className="hidden lg:flex items-center gap-3">
            <button 
              onClick={() => setShowSearch(true)}
              aria-label="Search" 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/5 text-primary hover:bg-primary/10 hover:scale-110 transition-all duration-300"
            >
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
            
            {(isAuthenticated && (groups.includes('editor') || groups.includes('admin') || groups.includes('contributor'))) && (
              <Link 
                href="/dashboard/compose" 
                className="flex items-center gap-2 px-5 py-2.5 bg-primary/5 text-primary font-bold rounded-full hover:bg-primary hover:text-white transition-all duration-300 shadow-sm hover:shadow-md"
              >
                <i className="fa-solid fa-pen-to-square"></i>
                <span>Write</span>
              </Link>
            )}

            <div className="h-6 w-[1px] bg-gray-200 mx-2"></div>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link 
                  href="/dashboard" 
                  className="flex items-center gap-2 px-4 py-2 font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors uppercase text-xs tracking-wider"
                >
                  <i className="fa-solid fa-gauge-high"></i>
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors uppercase text-xs tracking-wider"
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  href="/login" 
                  className="flex items-center gap-2 px-4 py-2 font-bold text-primary hover:bg-primary/10 rounded-lg transition-colors uppercase text-xs tracking-wider"
                >
                  <i className="fa-solid fa-right-to-bracket"></i>
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="px-6 py-2.5 font-bold bg-primary text-white rounded-full hover:bg-[#008f87] transition-all duration-300 uppercase text-xs tracking-wider shadow-sm hover:shadow-md active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile/Tablet Controls ── */}
          <div className="flex items-center gap-3 lg:hidden">
            <button 
              onClick={() => setShowSearch(true)}
              aria-label="Search" 
              className="text-primary text-xl p-2"
            >
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
            <button
              className="text-2xl text-primary p-2 transition-transform active:scale-90"
              aria-label="Toggle navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <i className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars-staggered"}`}></i>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile Menu Overlay ── */}
      <div className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[150] lg:hidden transition-opacity duration-300 ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMenuOpen(false)}></div>
      
      {/* ── Mobile/Tablet Menu Drawer ── */}
      <div className={`fixed top-0 right-0 h-full w-[280px] sm:w-[320px] bg-white z-[160] lg:hidden shadow-2xl transition-transform duration-500 ease-in-out transform ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full p-6">
          <div className="flex justify-between items-center mb-8">
            <Link href="/" className="flex items-center gap-1" onClick={() => setMenuOpen(false)}>
              <div className="bg-primary text-white p-1 rounded shadow-sm">
                <span className="font-bold text-lg leading-none">CM</span>
              </div>
              <span className="text-xl font-poppins font-extrabold text-[#1e1e1e]">Blog</span>
            </Link>
            <button onClick={() => setMenuOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
              <i className="fa-solid fa-xmark text-2xl"></i>
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-8">
            <NavLink href="/" icon="fa-house" onClick={() => setMenuOpen(false)}>Home</NavLink>
            <NavLink href="/category" icon="fa-layer-group" onClick={() => setMenuOpen(false)}>Categories</NavLink>
            {(isAuthenticated && (groups.includes('editor') || groups.includes('admin') || groups.includes('contributor'))) && (
              <NavLink href="/dashboard/compose" icon="fa-pen-to-square" onClick={() => setMenuOpen(false)}>Write a Story</NavLink>
            )}
          </div>

          <div className="mt-auto border-t border-gray-100 pt-8 flex flex-col gap-3">
            {isAuthenticated ? (
              <>
                <Link 
                  href="/dashboard" 
                  onClick={() => setMenuOpen(false)} 
                  className="w-full flex items-center justify-center gap-2 py-3.5 font-bold text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors"
                >
                  <i className="fa-solid fa-gauge-high"></i>
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="w-full flex items-center justify-center gap-2 py-3.5 font-bold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                >
                  <i className="fa-solid fa-right-from-bracket"></i>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  onClick={() => setMenuOpen(false)} 
                  className="w-full flex items-center justify-center gap-2 py-3.5 font-bold text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-colors"
                >
                  <i className="fa-solid fa-right-to-bracket"></i>
                  Login
                </Link>
                <Link 
                  href="/register" 
                  onClick={() => setMenuOpen(false)} 
                  className="w-full flex items-center justify-center gap-2 py-3.5 font-bold bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:bg-[#008f87] transition-all"
                >
                  <i className="fa-solid fa-user-plus"></i>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default NavBar;



