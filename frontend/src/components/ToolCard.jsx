import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const ToolCard = ({ title, description, icon: Icon, to, color = "red" }) => {
  const colorConfigs = {
    red:    { accent: 'text-red-500',    bg: 'bg-red-500/10',    border: 'group-hover:border-red-500/50',    glow: 'group-hover:shadow-red-500/20' },
    blue:   { accent: 'text-blue-500',   bg: 'bg-blue-500/10',   border: 'group-hover:border-blue-500/50',   glow: 'group-hover:shadow-blue-500/20' },
    green:  { accent: 'text-green-500',  bg: 'bg-green-500/10',  border: 'group-hover:border-green-500/50',  glow: 'group-hover:shadow-green-500/20' },
    yellow: { accent: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'group-hover:border-yellow-500/50', glow: 'group-hover:shadow-yellow-500/20' },
    purple: { accent: 'text-purple-500', bg: 'bg-purple-500/10', border: 'group-hover:border-purple-500/50', glow: 'group-hover:shadow-purple-500/20' },
  };

  const config = colorConfigs[color] || colorConfigs.red;

  return (
    <Link to={to} className="block h-full group relative">
       {/* Glow Effect behind card */}
      <div className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 blur transition duration-500 ${config.accent.replace('text-', 'via-')}`} />
      
      <motion.div
        whileHover={{ translateY: -4 }}
        className={`relative h-full p-6 rounded-2xl bg-[#111] border border-white/5 ${config.border} transition-all duration-300 flex flex-col items-start overflow-hidden group-hover:shadow-2xl ${config.glow}`}
      >
        {/* Subtle Background Gradient Mesh */}
        <div className={`absolute top-0 right-0 w-32 h-32 ${config.bg} blur-3xl rounded-full -mr-16 -mt-16 opacity-20 group-hover:opacity-40 transition-opacity duration-500`} />

        <div className={`p-3 rounded-xl ${config.bg} ${config.accent} mb-5 relative z-10 ring-1 ring-white/5 group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-6 h-6" strokeWidth={2} />
        </div>

        <h3 className="text-lg font-bold text-white mb-2 tracking-tight group-hover:text-gray-100 transition-colors relative z-10">
            {title}
        </h3>
        
        <p className="text-sm text-gray-400 mb-6 leading-relaxed flex-grow relative z-10">
            {description}
        </p>

        <div className={`flex items-center text-xs font-bold uppercase tracking-wider ${config.accent} opacity-100 transform translate-x-0 transition-all duration-300 relative z-10`}>
          Launch Tool <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </motion.div>
    </Link>
  );
};

export default ToolCard;
