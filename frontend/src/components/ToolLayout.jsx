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
      className="min-h-screen bg-gray-50"
    >
      <div className={`${selectedColor} py-12 md:py-20 px-4 text-center text-white transition-colors`}>
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>
            <p className="text-lg md:text-xl opacity-90">{description}</p>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-20 relative z-10">
        <div className="bg-white rounded-xl shadow-xl p-6 md:p-12 min-h-[500px] border border-gray-100 flex flex-col items-center justify-center">
            {children}
        </div>
      </div>
    </motion.div>
  );
};

export default ToolLayout;
