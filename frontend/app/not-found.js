import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-8">
        <h1 className="text-[12rem] font-black text-gray-100 select-none">404</h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-primary/10 p-6 rounded-full animate-bounce">
            <i className="fa-solid fa-ghost text-6xl text-primary"></i>
          </div>
        </div>
      </div>
      
      <h2 className="text-4xl font-bold text-gray-900 mb-4 font-poppins">
        Oops! Page Not Found
      </h2>
      
      <p className="text-gray-500 max-w-md mb-10 text-lg leading-relaxed">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <Link 
          href="/"
          className="px-8 py-4 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/30 hover:scale-105 transition-transform duration-300 flex items-center gap-2"
        >
          <i className="fa-solid fa-house"></i>
          Back to Homepage
        </Link>
        
        <Link 
          href="/search"
          className="px-8 py-4 bg-white text-gray-700 border border-gray-200 rounded-full font-bold hover:bg-gray-50 transition-colors duration-300 flex items-center gap-2"
        >
          <i className="fa-solid fa-magnifying-glass"></i>
          Search Blogs
        </Link>
      </div>

      <div className="mt-16 text-gray-400 text-sm">
        <p>If you think this is a mistake, please <Link href="/contact" className="text-primary hover:underline">contact support</Link>.</p>
      </div>
    </div>
  );
}
