'use client';

import React from 'react';

const LoadingSpinner = ({ text = 'Loading...', size = 'md', color = 'primary', fullPage = false }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-16 h-16 border-4',
  };

  const spinnerContent = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`relative ${sizeClasses[size]} rounded-full border-gray-200 border-t-primary animate-spin shadow-sm`}>
        <div className="absolute inset-0 rounded-full border-t-primary opacity-20 animate-pulse"></div>
      </div>
      {text && (
        <span className="text-gray-500 font-medium animate-pulse tracking-wide">
          {text}
        </span>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[10000] flex items-center justify-center">
        {spinnerContent}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8 w-full min-h-[200px]">
      {spinnerContent}
    </div>
  );
};

export default LoadingSpinner;
