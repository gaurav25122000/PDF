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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => navigate('/')}
        className="absolute inset-0 bg-marvel-black/90 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
        className={`relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
            <h2 className="text-2xl font-heading font-bold text-gray-900 uppercase tracking-tight">
                {title}
            </h2>
            <button 
                onClick={() => navigate('/')}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors group"
                aria-label="Close"
            >
                <X className="w-6 h-6 text-gray-400 group-hover:text-marvel-red" />
            </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 custom-scrollbar">
            {children}
        </div>
        
        {/* Border accent */}
        <div className="h-1 bg-marvel-red w-full sticky bottom-0" />
      </motion.div>
    </div>
  );
};

export default ToolModal;
