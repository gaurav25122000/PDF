import React, { useEffect, useState } from 'react';
import { Mail, MapPin, ArrowLeft, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [emailError, setEmailError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSent, setIsSent] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
      }, []);

    const validateEmail = (email) => {
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Clear error when user types
        if (name === 'email' && emailError) {
            setEmailError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic Validation
        if (!formData.name || !formData.email || !formData.message) {
            setEmailError('Please fill in all required fields'); // Re-using error state for simplicity, or add generic error
            return; 
        }

        // Email Validation
        if (!validateEmail(formData.email)) {
            setEmailError('Please enter a valid email address');
            return;
        }

        setIsSubmitting(true);

        // Simulate API Call
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setIsSent(true);
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

  return (
    <div className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 relative z-10">
      <SEO 
        title="Contact Us - MarvelPDF" 
        description="Get in touch with the MarvelPDF team. We are here to help with any questions or support requests."
        keywords="contact us, support, help, email support"
      />
      
      {/* Decorative BG */}
      {/* Background Elements */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2 -z-10" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2 -z-10" />

      <div className="max-w-5xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium mb-10 group text-sm">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10 group-hover:bg-white/10 transition-all">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Tools
        </Link>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
            {/* Info Column */}
            <div className="space-y-6 md:space-y-8">
                <div>
                     <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-tight">Get in Touch</h1>
                    <p className="text-lg text-gray-400 leading-relaxed">
                        Have a question, suggestion, or just want to say hi? We'd love to hear from you.
                    </p>
                </div>
                
                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="bg-red-500/10 p-3 rounded-xl shrink-0">
                            <Mail className="text-red-500" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Email Us</h3>
                            <a href="mailto:support@marvelpdf.com" className="text-gray-400 hover:text-red-500 transition-colors block">support@marvelpdf.com</a>
                            <p className="text-gray-500 text-xs mt-1">Response time: ~24 hours</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                        <div className="bg-blue-500/10 p-3 rounded-xl shrink-0">
                            <MapPin className="text-blue-500" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">HQ</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">123 Marvel Way<br/>New York, NY 10012</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Column */}
            <div className="bg-[#111] p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl">
                <h3 className="font-heading text-2xl font-bold text-white mb-8">Send us a message</h3>
                
                {isSent ? (
                    <div className="text-center py-12 bg-green-500/10 rounded-2xl border border-green-500/20">
                        <div className="bg-green-500/20 p-4 rounded-full inline-flex mb-4">
                            <CheckCircle className="text-green-500" size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Message Sent!</h4>
                        <p className="text-gray-400 max-w-xs mx-auto mb-6">Thank you for reaching out. We'll get back to you as soon as possible.</p>
                        <button 
                            onClick={() => setIsSent(false)} 
                            className="bg-white/10 text-white px-6 py-2 rounded-lg font-bold hover:bg-white/20 transition-colors"
                        >
                            Send another
                        </button>
                    </div>
                ) : (
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Name</label>
                                <input 
                                    type="text" 
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-700" 
                                    placeholder="John Doe" 
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email</label>
                                <input 
                                    type="email" 
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border text-white placeholder-gray-700 ${emailError ? 'border-red-500 ring-1 ring-red-500' : 'border-white/10'} focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all`} 
                                    placeholder="john@example.com" 
                                    required
                                />
                                {emailError && (
                                    <div className="flex items-center gap-1 mt-2 text-red-500 text-xs font-medium pl-1">
                                        <AlertCircle size={12} />
                                        <span>{emailError}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Subject</label>
                            <input 
                                type="text" 
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-700" 
                                placeholder="Feature Request..." 
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Message</label>
                            <textarea 
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                rows="4" 
                                className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/10 text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder-gray-700" 
                                placeholder="How can we help?"
                                required
                            ></textarea>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className={`w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group shadow-lg hover:shadow-white/10 ${isSubmitting ? 'opacity-80 cursor-wait' : ''}`}
                        >
                            {isSubmitting ? (
                                <span>Sending...</span>
                            ) : (
                                <>
                                    <span>Send Message</span>
                                    <Send size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
