import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';

import SEO from '../components/SEO';

const Signup = () => {
 // ... state logic

  // ... handleSubmit

  return (
    <div className="flex items-center justify-center p-4 w-full max-w-md relative z-10">
      <SEO 
        title="Sign Up for MarvelPDF - Free Account" 
        description="Create a free MarvelPDF account to unlock higher limits and manage your document history. Fast, secure, and free."
        keywords="sign up, create account, free pdf tools"
      />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-marvel-black/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full border border-gray-800"
      >
        <Link to="/" className="text-gray-400 hover:text-marvel-red mb-8 inline-flex items-center gap-2 transition-colors text-sm font-bold uppercase tracking-wide group">
             <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Home
        </Link>

        <div className="text-center mb-8">
            <h2 className="text-4xl font-heading text-white mb-2 tracking-tight">
              Join MarvelPDF
            </h2>
            <p className="text-gray-400">Create your account to transform PDFs</p>
        </div>

        {error && (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-red-500/10 border-l-4 border-marvel-red text-marvel-red p-4 rounded-r-lg mb-6 text-sm font-medium"
            >
                {error}
            </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <UserIcon className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-marvel-red transition-colors" size={20} />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-marvel-red focus:ring-1 focus:ring-marvel-red transition-all"
              placeholder="Your Name"
            />
          </div>

          <div className="relative group">
            <Mail className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-marvel-red transition-colors" size={20} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-marvel-red focus:ring-1 focus:ring-marvel-red transition-all"
              placeholder="Email Address"
            />
          </div>
          
          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-marvel-red transition-colors" size={20} />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-marvel-red focus:ring-1 focus:ring-marvel-red transition-all"
              placeholder="Password"
            />
          </div>
          
          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-marvel-red transition-colors" size={20} />
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-marvel-red focus:ring-1 focus:ring-marvel-red transition-all"
              placeholder="Confirm Password"
            />
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-marvel-red hover:bg-red-700 text-white font-bold py-3.5 rounded-xl mt-4 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
          >
            <UserPlus size={20} /> Create Account
          </motion.button>
        </form>

        <p className="mt-8 text-center text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-white hover:text-marvel-red font-bold transition-colors">
                Log in
            </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
