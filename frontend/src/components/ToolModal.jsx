import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const ToolModal = ({ children, title, className = "" }) => {
  const navigate = useNavigate();

  // Close modal on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        navigate('/');
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => navigate('/')}
        className="absolute inset-0 bg-[#000]/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
        className={`relative w-full max-w-4xl bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-[#111] sticky top-0 z-10">
            <h2 className="text-2xl font-heading font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-6 bg-red-600 rounded-full mr-2"></span>
                {title}
            </h2>
            <button 
                onClick={() => navigate('/')}
                className="p-2 rounded-xl hover:bg-white/10 transition-all group border border-transparent hover:border-white/10"
                aria-label="Close"
            >
                <X className="w-6 h-6 text-gray-400 group-hover:text-red-500" />
            </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-8 custom-scrollbar bg-[#0a0a0a]">
            {children}
        </div>
        
        {/* Border accent */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-red-600 to-transparent w-full sticky bottom-0 opacity-50" />
      </motion.div>
    </div>
  );
};

export default ToolModal;
