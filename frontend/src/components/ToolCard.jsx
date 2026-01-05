import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const ToolCard = ({ title, description, icon: Icon, to, color = "red" }) => {
  const colorClasses = {
    red: 'bg-red-50 text-marvel-red ring-marvel-red',
    blue: 'bg-blue-50 text-blue-600 ring-blue-600',
    green: 'bg-green-50 text-green-600 ring-green-600',
    yellow: 'bg-yellow-50 text-yellow-600 ring-yellow-600',
    purple: 'bg-purple-50 text-purple-600 ring-purple-600',
  };

  const selectedColorClass = colorClasses[color] || colorClasses.red;

  return (
    <Link
      to={to}
      className="block w-full h-full" // Simplified Link className, styling moved to motion.div
    >
      <motion.div
        whileHover={{ scale: 1.05, translateY: -5 }}
        whileTap={{ scale: 0.95 }}
        className="bg-white p-6 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-marvel-red h-full flex flex-col items-start relative group overflow-hidden"
      >
        {/* New absolute div for background effect */}
        <div className={`absolute top-0 right-0 w-24 h-24 bg-${color} opacity-5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-500`}></div>

        {/* Modified icon container div */}
        <div className={`p-3 rounded-lg ${selectedColorClass.replace('group-hover:bg-red-500 group-hover:text-white', '')} mb-4 group-hover:ring-4 ring-opacity-20 transition-all duration-300`}>
          <Icon className="w-8 h-8" /> {/* Icon size changed */}
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-gray-900">{title}</h2>
        <p className="text-gray-500 text-sm mb-4 leading-relaxed flex-grow">{description}</p>
        <div className="flex items-center text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
          Open Tool <ArrowRight className="w-4 h-4 ml-1" />
        </div>
      </motion.div>
    </Link>
  );
};

export default ToolCard;
