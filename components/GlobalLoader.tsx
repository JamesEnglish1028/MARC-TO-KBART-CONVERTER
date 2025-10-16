import React from 'react';

interface GlobalLoaderProps {
  isLoading: boolean;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({ isLoading }) => {
  return (
    <div
      className={`fixed top-0 left-0 w-full h-1 z-50 transition-opacity duration-300 ${
        isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="progressbar"
      aria-busy={isLoading}
      aria-valuetext="Loading"
    >
      <div className="relative w-full h-full bg-cyan-500/20 overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-full bg-cyan-500 animate-indeterminate-progress"></div>
      </div>
    </div>
  );
};

export default GlobalLoader;