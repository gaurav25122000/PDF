import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Mail, MapPin, Phone } from 'lucide-react';

const Contact = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800 pt-24 pb-12 px-4 sm:px-6 lg:px-8 absolute inset-0 z-40 overflow-y-auto">
      <Helmet>
        <title>Contact Us - MarvelPDF</title>
      </Helmet>
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-heading text-marvel-black mb-8 text-center">Get in Touch</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Info */}
            <div className="space-y-8">
                <p className="text-lg text-gray-600">
                    Have a question, suggestion, or just want to say hi? We'd love to hear from you.
                </p>
                
                <div className="flex items-start gap-4">
                    <div className="bg-marvel-red/10 p-3 rounded-lg">
                        <Mail className="text-marvel-red" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-marvel-black text-lg">Email Us</h3>
                        <p className="text-gray-600">support@marvelpdf.com</p>
                        <p className="text-gray-500 text-sm mt-1">We'll respond within 24 hours.</p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="bg-marvel-red/10 p-3 rounded-lg">
                        <MapPin className="text-marvel-red" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-marvel-black text-lg">HQ</h3>
                        <p className="text-gray-600">123 Marvel Way<br/>New York, NY 10012</p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
                        <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-marvel-red focus:border-transparent outline-none transition-all" placeholder="Your Name" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
                        <input type="email" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-marvel-red focus:border-transparent outline-none transition-all" placeholder="you@example.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
                        <textarea rows="4" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-marvel-red focus:border-transparent outline-none transition-all" placeholder="How can we help?"></textarea>
                    </div>
                    <button type="button" className="w-full bg-marvel-red text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors">
                        Send Message
                    </button>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
