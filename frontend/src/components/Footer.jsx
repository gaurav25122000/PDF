import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Github, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-marvel-black text-gray-400 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
             <div className="flex items-center mb-4">
                <div className="bg-marvel-red text-white font-heading text-xl px-2 pt-1 pb-1 tracking-tighter select-none">
                MARVEL
                </div>
                <span className="ml-1 font-heading text-xl tracking-tighter text-white">PDF</span>
            </div>
            <p className="text-sm text-gray-500 mb-4">
               Legendary PDF tools for everyday heroes. Merge, split, and edit with superpower speed.
            </p>
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} MarvelPDF. All rights reserved.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-bold uppercase tracking-wider mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
                <li><Link to="/merge-pdf" className="hover:text-marvel-red transition-colors">Merge PDF</Link></li>
                <li><Link to="/split-pdf" className="hover:text-marvel-red transition-colors">Split PDF</Link></li>
                <li><Link to="/compress-pdf" className="hover:text-marvel-red transition-colors">Compress PDF</Link></li>
                <li><Link to="/pdf-to-word" className="hover:text-marvel-red transition-colors">Convert to Word</Link></li>
            </ul>
          </div>

          <div>
             <h3 className="text-white font-bold uppercase tracking-wider mb-4">Support</h3>
             <ul className="space-y-2 text-sm">
                <li><Link to="/contact" className="hover:text-marvel-red transition-colors">Contact Us</Link></li>
                <li><Link to="/about" className="hover:text-marvel-red transition-colors">About Us</Link></li>
                <li><Link to="/faq" className="hover:text-marvel-red transition-colors">FAQ</Link></li>
             </ul>
          </div>

          <div>
             <h3 className="text-white font-bold uppercase tracking-wider mb-4">Legal</h3>
             <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="hover:text-marvel-red transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-marvel-red transition-colors">Terms of Service</Link></li>
                <li><Link to="/security" className="hover:text-marvel-red transition-colors">Security</Link></li>
             </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold uppercase tracking-wider mb-4">Contact</h3>
            <div className="flex flex-col space-y-3 text-sm">
                <a href="mailto:marvel.pdf.queries@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
                    <Mail size={16} className="text-marvel-red" />
                    marvel.pdf.queries@gmail.com
                </a>
                <div className="flex space-x-4 mt-2">
                    <a href="#" className="text-gray-500 hover:text-white transition-colors"><Github size={20} /></a>
                    <a href="#" className="text-gray-500 hover:text-white transition-colors"><Twitter size={20} /></a>
                </div>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
