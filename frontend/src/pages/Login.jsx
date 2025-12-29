import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LogIn, Lock, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center p-4 w-full max-w-md relative z-10">
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
              Welcome Back
            </h2>
            <p className="text-gray-400">Sign in to access your tools</p>
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

        <form onSubmit={handleSubmit} className="space-y-6">
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
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-marvel-red hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
          >
            <LogIn size={20} /> Log In
          </motion.button>
        </form>

        <p className="mt-8 text-center text-gray-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-white hover:text-marvel-red font-bold transition-colors">
                Sign up
            </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
