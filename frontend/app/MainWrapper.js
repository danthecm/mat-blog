'use client';

import { usePathname } from 'next/navigation';
import NavBar from '@/src/components/common/Navbar';
import Footer from '@/src/components/common/Footer';
import Link from 'next/link';

export default function MainWrapper({ children }) {
  const pathname = usePathname();
  
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isDashboard = pathname.startsWith('/dashboard');

  if (isAuthPage) {
    return (
      <div className="min-h-screen flex flex-col lg:flex-row bg-white">
        {/* Left Side - Visual/Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-10 left-10 w-64 h-64 border-8 border-white rounded-full"></div>
              <div className="absolute bottom-20 right-20 w-96 h-96 border-[12px] border-white rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white rotate-45"></div>
          </div>
          
          <div className="z-10 text-white max-w-md">
            <Link href="/" className="inline-block mb-12">
               <h2 className="text-4xl font-extrabold font-poppins"><span className="bg-white text-primary px-2 rounded mr-1">CM</span>Blog</h2>
            </Link>
            <h1 className="text-5xl font-bold mb-6 leading-tight">Welcome to the Newsroom.</h1>
            <p className="text-xl text-[#d1e7e5] leading-relaxed">
              Join thousands of writers and readers in the most vibrant community-driven publication.
            </p>
          </div>
        </div>

        {/* Right Side - Content */}
        <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-20 bg-main-bg">
          <div className="lg:hidden mb-8 text-center">
              <Link href="/" className="inline-block">
                  <h2 className="text-3xl font-extrabold font-poppins text-primary"><span className="bg-primary text-white px-2 rounded mr-1">CM</span>Blog</h2>
              </Link>
          </div>
          <div className="max-w-md w-full mx-auto">
              {children}
          </div>
          <div className="mt-8 text-center text-sm text-gray-500">
              <Link href="/" className="hover:text-primary transition-colors">← Back to Homepage</Link>
          </div>
        </div>
      </div>
    );
  }

  if (isDashboard) {
    return <main>{children}</main>;
  }

  return (
    <>
      <NavBar />
      <main className="min-h-[80vh]">
        {children}
      </main>
      <Footer />
    </>
  );
}
