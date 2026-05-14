import React from "react";
import Link from "next/link";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const FooterLink = ({ href, children, icon }) => (
    <li>
      <Link 
        href={href} 
        className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors duration-300 py-1.5 group"
      >
        {icon && <i className={`fa-solid ${icon} text-xs opacity-50 group-hover:opacity-100 transition-opacity`}></i>}
        <span className="text-[15px]">{children}</span>
      </Link>
    </li>
  );

  const SocialLink = ({ href, icon, color }) => (
    <a 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer"
      className={`w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-100 shadow-sm text-gray-500 transition-all duration-300 hover:scale-110 hover:text-white ${color}`}
    >
      <i className={`fa-brands ${icon} text-lg`}></i>
    </a>
  );

  return (
    <footer className="bg-[#f8fdfc] border-t border-[#e1f0ef]">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          
          {/* Brand Section */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-1 group">
              <div className="bg-primary text-white p-1 rounded shadow-sm group-hover:rotate-12 transition-transform duration-300">
                <span className="font-bold text-lg leading-none">CM</span>
              </div>
              <span className="text-xl font-poppins font-extrabold text-[#1e1e1e]">Blog</span>
            </Link>
            <p className="text-gray-600 text-sm leading-relaxed max-w-xs">
              Empowering voices through community-driven storytelling. Join our platform to share, learn, and connect with writers worldwide.
            </p>
            <div className="flex items-center gap-3">
              <SocialLink href="#" icon="fa-facebook-f" color="hover:bg-[#1877F2]" />
              <SocialLink href="#" icon="fa-x-twitter" color="hover:bg-[#000000]" />
              <SocialLink href="#" icon="fa-instagram" color="hover:bg-[#E4405F]" />
              <SocialLink href="#" icon="fa-linkedin-in" color="hover:bg-[#0A66C2]" />
            </div>
          </div>

          {/* Categories Section */}
          <div>
            <h3 className="text-[#1e1e1e] font-bold mb-6 text-lg">Explore Categories</h3>
            <ul className="space-y-1">
              <FooterLink href="/category/travel" icon="fa-plane">Travel & Adventure</FooterLink>
              <FooterLink href="/category/health" icon="fa-heart-pulse">Health & Wellness</FooterLink>
              <FooterLink href="/category/design" icon="fa-palette">Design & Creativity</FooterLink>
              <FooterLink href="/category/education" icon="fa-graduation-cap">Learning & Education</FooterLink>
              <FooterLink href="/category/technology" icon="fa-microchip">Tech & Innovation</FooterLink>
            </ul>
          </div>

          {/* Quick Links Section */}
          <div>
            <h3 className="text-[#1e1e1e] font-bold mb-6 text-lg">Quick Links</h3>
            <ul className="space-y-1">
              <FooterLink href="/faq">Help & FAQ</FooterLink>
              <FooterLink href="/terms">Terms & Conditions</FooterLink>
              <FooterLink href="/support">Technical Support</FooterLink>
              <FooterLink href="/privacy">Privacy Policy</FooterLink>
              <FooterLink href="/about">About Our Mission</FooterLink>
            </ul>
          </div>

          {/* Newsletter Section */}
          <div className="space-y-6">
            <h3 className="text-[#1e1e1e] font-bold text-lg">Stay in the Loop</h3>
            <p className="text-gray-600 text-sm">
              Get the latest stories and community updates delivered straight to your inbox.
            </p>
            <form className="relative group">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
              />
              <button 
                type="submit"
                className="absolute right-2 top-2 bottom-2 px-6 bg-primary text-white font-bold rounded-lg text-sm hover:bg-[#008f87] transition-colors shadow-sm active:scale-95"
              >
                Join
              </button>
            </form>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-[#e1f0ef] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            &copy; {currentYear} <span className="font-bold text-primary">CM Blog</span>. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <span>Designed by <span className="text-gray-600 font-medium">CM</span></span>
            <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
            <span>Developed by <span className="text-gray-600 font-medium">DanTheCM</span></span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

