'use client';

import React, { useState } from 'react';
import api from '@/src/components/utils/api';

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    
    try {
      await api.post('/engagement/newsletter/subscribe/', { email });
      setStatus("success");
      setEmail("");
    } catch (err) {
      setStatus("error");
    }
  };

  return (
    <div className="bg-primary p-8 md:p-10 rounded-2xl shadow-xl overflow-hidden relative">
      {/* Decorative background element */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#008f87] rounded-full blur-3xl opacity-50"></div>
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 font-poppins">Join our newsroom!</h2>
          <p className="text-[#d1e7e5] font-medium">Get weekly insights, trending stories, and community polls delivered straight to your inbox.</p>
        </div>
        
        <div className="w-full md:w-auto flex-1 max-w-md">
          {status === "success" ? (
            <div className="bg-[#d1e7e5] p-4 rounded-xl text-primary font-bold text-center animate-in zoom-in duration-300">
              <i className="fa-solid fa-circle-check mr-2"></i> You're on the list! Welcome aboard.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 px-5 py-3.5 rounded-xl border-none focus:ring-2 focus:ring-[#d1e7e5] outline-none shadow-inner"
              />
              <button 
                type="submit" 
                disabled={status === "loading"}
                className="bg-[#1e1e1e] text-white font-bold px-8 py-3.5 rounded-xl hover:bg-black transition-all shadow-lg active:scale-95"
              >
                {status === "loading" ? (
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                ) : "SUBSCRIBE"}
              </button>
            </form>
          )}
          {status === "error" && (
            <p className="text-white text-xs mt-2 font-bold opacity-80">* Something went wrong. Please try again.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Newsletter;
