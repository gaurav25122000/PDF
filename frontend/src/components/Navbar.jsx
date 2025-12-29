import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';

const Navbar = () => {
  return (
    <nav className="bg-marvel-black text-white shadow-lg border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center flex-shrink-0 group">
              <div className="bg-marvel-red text-white font-heading text-4xl px-2 pt-1 pb-1 tracking-tighter transform group-hover:scale-105 transition-transform duration-200 select-none">
                MARVEL
              </div>
              <span className="ml-1 font-heading text-2xl tracking-tighter text-white">PDF</span>
            </Link>
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <Link to="/merge-pdf" className="hover:text-marvel-red px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wide transition-colors">Merge</Link>
              <Link to="/split-pdf" className="hover:text-marvel-red px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wide transition-colors">Split</Link>
              <Link to="/compress-pdf" className="hover:text-marvel-red px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wide transition-colors">Compress</Link>
              <Link to="/pdf-to-word" className="hover:text-marvel-red px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wide transition-colors">Convert</Link>
              <Link to="/" className="bg-marvel-red hover:bg-red-700 text-white px-5 py-2 rounded-sm text-sm font-bold uppercase tracking-wide transition-colors ml-4">
                All Tools
              </Link>
            </div>
          </div>
          <div className="flex items-center">
             <button className="bg-gray-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-800 transition-colors">
                Log In
             </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
