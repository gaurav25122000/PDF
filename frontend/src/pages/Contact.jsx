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
    <div className="min-h-screen bg-gray-50 text-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <SEO 
        title="Contact Us - MarvelPDF" 
        description="Get in touch with the MarvelPDF team. We are here to help with any questions or support requests."
        keywords="contact us, support, help, email support"
      />
      
      {/* Decorative BG */}
      <div className="fixed top-0 inset-x-0 h-[300px] bg-gradient-to-b from-white to-gray-50 pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-marvel-black transition-colors font-bold mb-6 md:mb-10 group">
            <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 group-hover:shadow-md transition-all">
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="text-sm">Back to Tools</span>
        </Link>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
            {/* Info Column */}
            <div className="space-y-6 md:space-y-8">
                <div>
                     <h1 className="text-3xl md:text-5xl font-heading text-marvel-black mb-4">Get in Touch</h1>
                    <p className="text-lg text-gray-600 leading-relaxed">
                        Have a question, suggestion, or just want to say hi? We'd love to hear from you.
                    </p>
                </div>
                
                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                        <div className="bg-marvel-red/10 p-3 rounded-xl shrink-0">
                            <Mail className="text-marvel-red" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-marvel-black text-lg">Email Us</h3>
                            <a href="mailto:support@marvelpdf.com" className="text-gray-600 hover:text-marvel-red transition-colors block">support@marvelpdf.com</a>
                            <p className="text-gray-400 text-xs mt-1">Response time: ~24 hours</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                        <div className="bg-blue-50 p-3 rounded-xl shrink-0">
                            <MapPin className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-marvel-black text-lg">HQ</h3>
                            <p className="text-gray-600 text-sm leading-relaxed">123 Marvel Way<br/>New York, NY 10012</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Column */}
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="font-heading text-xl mb-6">Send us a message</h3>
                
                {isSent ? (
                    <div className="text-center py-10 bg-green-50 rounded-2xl border border-green-100">
                        <div className="bg-green-100 p-4 rounded-full inline-flex mb-4">
                            <CheckCircle className="text-green-600" size={32} />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h4>
                        <p className="text-gray-600 max-w-xs mx-auto mb-6">Thank you for reaching out. We'll get back to you as soon as possible.</p>
                        <button 
                            onClick={() => setIsSent(false)} 
                            className="bg-white text-gray-900 px-6 py-2 rounded-lg font-bold shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            Send another
                        </button>
                    </div>
                ) : (
                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Name</label>
                                <input 
                                    type="text" 
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-marvel-red/20 focus:border-marvel-red outline-none transition-all" 
                                    placeholder="John Doe" 
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                                <input 
                                    type="email" 
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-3 rounded-xl bg-gray-50 border ${emailError ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200'} focus:bg-white focus:ring-2 focus:ring-marvel-red/20 focus:border-marvel-red outline-none transition-all`} 
                                    placeholder="john@example.com" 
                                    required
                                />
                                {emailError && (
                                    <div className="flex items-center gap-1 mt-1 text-red-500 text-xs font-medium pl-1">
                                        <AlertCircle size={12} />
                                        <span>{emailError}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subject</label>
                            <input 
                                type="text" 
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-marvel-red/20 focus:border-marvel-red outline-none transition-all" 
                                placeholder="Feature Request..." 
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Message</label>
                            <textarea 
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                rows="4" 
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-marvel-red/20 focus:border-marvel-red outline-none transition-all" 
                                placeholder="How can we help?"
                                required
                            ></textarea>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className={`w-full bg-marvel-black text-white font-bold py-4 rounded-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-2 group ${isSubmitting ? 'opacity-80 cursor-wait' : ''}`}
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
