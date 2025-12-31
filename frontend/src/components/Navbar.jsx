import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:scale-105 transition-transform duration-300">
                <span className="font-bold text-white text-lg">M</span>
              </div>
              <span className="font-heading text-xl font-bold tracking-tight text-white group-hover:text-gray-200 transition-colors">
                Marvel<span className="text-gray-500">PDF</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            <div className="flex items-center gap-6 mr-6">
                {[
                    { name: 'Merge', path: '/merge-pdf' },
                    { name: 'Split', path: '/split-pdf' },
                    { name: 'Compress', path: '/compress-pdf' },
                    { name: 'Convert', path: '/pdf-to-word' },
                ].map((item) => (
                    <Link 
                        key={item.path} 
                        to={item.path} 
                        className="text-sm font-medium text-gray-400 hover:text-white transition-colors relative group py-2"
                    >
                        {item.name}
                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
                    </Link>
                ))}
            </div>
            
            <div className="h-6 w-px bg-white/10 mx-2" />

            {/* Auth Section */}
            <div className="flex items-center gap-4 ml-4">
               {user ? (
                   <div className="flex items-center gap-4 pl-4">
                       <div className="text-right hidden sm:block leading-tight">
                          <div className="text-sm font-semibold text-gray-200">{user.name || 'User'}</div>
                          <div className="text-xs text-red-500 font-medium">
                              {user.usageToday !== undefined ? `${3 - user.usageToday} uses left` : 'Pro Member'}
                          </div>
                       </div>
                       <button 
                          onClick={logout}
                          className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-red-500"
                          title="Logout"
                          aria-label="Logout"
                       >
                          <LogOut size={18} />
                       </button>
                   </div>
               ) : (
                  <Link to="/login">
                      <button className="relative px-6 py-2 rounded-full font-medium text-sm text-white overflow-hidden group">
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-red-600 to-red-800 opacity-90 group-hover:opacity-100 transition-opacity" />
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-red-500 to-red-700 opacity-0 group-hover:opacity-100 transition-opacity blur-lg" />
                          <span className="relative z-10 flex items-center gap-2">
                              Log In <User size={14} />
                          </span>
                      </button>
                  </Link>
               )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
