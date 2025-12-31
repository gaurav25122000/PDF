import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const ToolLayout = ({ title, description, children, color = "red" }) => {
  const bgColors = {
    red: "bg-red-600",
    blue: "bg-blue-600",
    green: "bg-green-600",
    purple: "bg-purple-600",
    yellow: "bg-yellow-600",
    pink: "bg-pink-600",
    black: "bg-gray-800"
  };

  const selectedColor = bgColors[color] || bgColors.red;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0a0a0a] text-white"
    >
      <div className={`py-12 md:py-24 px-4 text-center text-white relative overflow-hidden`}>
         <div className={`absolute inset-0 ${selectedColor} opacity-10 pointer-events-none`}></div>
         <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a0a0a] pointer-events-none"></div>
         
         {/* Decorative Glow */}
         <div className={`absolute top-0 center w-[500px] h-[500px] ${selectedColor.replace('bg-', 'bg-')}/20 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 left-1/2 -translate-x-1/2`}></div>

        <div className="max-w-4xl mx-auto relative z-10">
            <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 uppercase tracking-widest text-xs font-bold transition-colors">
                <ArrowLeft size={14} /> Back to Tools
            </Link>
            <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4 tracking-tight">{title}</h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">{description}</p>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 pb-20 relative z-10">
        <div className="bg-[#111] rounded-3xl shadow-2xl p-6 md:p-12 min-h-[500px] border border-white/10 flex flex-col items-center justify-center backdrop-blur-sm bg-opacity-80">
            {children}
        </div>
      </div>
    </motion.div>
  );
};

export default ToolLayout;
