import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Github, Twitter, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-black/20 backdrop-blur-lg mt-auto relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          
          {/* Brand */}
          <div className="col-span-1 md:col-span-1 space-y-4">
             <Link to="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
                    <span className="font-bold text-white text-lg">M</span>
                </div>
                <span className="font-heading text-lg font-bold text-white">MarvelPDF</span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed">
               Professional PDF tools for everyone. 
               <br/>Secure, fast, and free.
            </p>
            <div className="flex items-center gap-4 pt-2">
                 <a href="#" className="text-gray-500 hover:text-white transition-colors"><Twitter size={18} /></a>
                 <a href="#" className="text-gray-500 hover:text-white transition-colors"><Github size={18} /></a>
            </div>
          </div>

          {/* Links Groups */}
          {[
              { title: "Product", links: [
                  { label: "Merge PDF", to: "/merge-pdf" },
                  { label: "Split PDF", to: "/split-pdf" },
                  { label: "Compress PDF", to: "/compress-pdf" },
                  { label: "Convert PDF", to: "/pdf-to-word" },
              ]},
              { title: "Resources", links: [
                  { label: "Blog", to: "/#" },
                  { label: "Developers", to: "/#" },
                  { label: "Status", to: "/#" },
              ]},
              { title: "Company", links: [
                  { label: "About", to: "/about" },
                  { label: "Contact", to: "/contact" },
                  { label: "Privacy", to: "/privacy" },
                  { label: "Terms", to: "/terms" },
              ]}
          ].map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">{group.title}</h3>
                <ul className="space-y-3 text-sm">
                    {group.links.map(link => (
                        <li key={link.label}>
                            <Link to={link.to} className="text-gray-500 hover:text-red-500 transition-colors">
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>
              </div>
          ))}
        </div>
        
        <div className="border-t border-white/5 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-gray-600">
            <p>© {new Date().getFullYear()} MarvelPDF Inc. All rights reserved.</p>
            <p className="flex items-center gap-1 mt-2 md:mt-0">
                Made with <Heart size={12} className="text-red-900 fill-red-900" /> in the Multiverse
            </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
