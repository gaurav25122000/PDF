import React, { useEffect, useState } from 'react';
import { Plus, Minus, ArrowLeft, HelpCircle, Shield, Sliders, FileWarning } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-white/10 rounded-2xl bg-white/5 overflow-hidden transition-all duration-300 hover:bg-white/10">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 md:p-6 text-left focus:outline-none group bg-transparent"
        aria-expanded={isOpen}
      >
        <span className={`font-bold text-lg md:text-xl pr-4 leading-snug ${isOpen ? 'text-white' : 'text-gray-300'} group-hover:text-white transition-colors`}>
            {question}
        </span>
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-marvel-red text-white' : 'bg-white/10 text-gray-500 group-hover:bg-marvel-red/20 group-hover:text-marvel-red'}`}>
            {isOpen ? <Minus size={18} /> : <Plus size={18} />}
        </div>
      </button>
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="p-5 md:p-6 pt-0 border-t border-white/5 text-gray-400 leading-relaxed text-base md:text-lg">
            {answer}
        </div>
      </div>
    </div>
  );
};

const FAQCategory = ({ title, icon: Icon, children }) => (
    <div className="mb-10 md:mb-16">
        <h3 className="text-xl md:text-2xl font-heading font-bold text-white mb-6 flex items-center gap-3">
            <div className="p-2 bg-marvel-red/10 rounded-lg text-marvel-red border border-marvel-red/20">
                <Icon size={24} />
            </div>
            {title}
        </h3>
        <div className="grid gap-4">
            {children}
        </div>
    </div>
);

const FAQ = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 relative z-10">
      <SEO 
        title="Frequently Asked Questions - MarvelPDF Support" 
        description="Find answers to common questions about MarvelPDF. Learn about our free limits, file safety, and supported formats."
        keywords="faq, help, support, pdf questions, how to merge pdf, pdf converter help"
      />
      
      {/* Background Elements */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2 -z-10" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2 -z-10" />

      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium mb-8 md:mb-12 group">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10 group-hover:bg-white/10 transition-all">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            <span className="text-sm md:text-base">Back to Tools</span>
        </Link>
        
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
            <h1 className="text-4xl md:text-6xl font-heading text-white mb-6">
                How can we help?
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Everything you need to know about MarvelPDF. Can't find the answer? <a href="mailto:support@marvelpdf.com" className="text-marvel-red hover:text-white transition-colors underline">Contact us</a>.
            </p>
        </div>
        
        {/* Categories */}
        <FAQCategory title="General Questions" icon={HelpCircle}>
            <FAQItem 
                question="Is MarvelPDF really free?" 
                answer="Yes! We provide free access to all our high-quality PDF tools. To ensure the service remains fast and available for everyone, we have a generous daily limit of 3 tasks per user."
            />
            <FAQItem 
                question="Do I need to create an account?" 
                answer="No account is required for basic usage. You can merge, split, and convert PDFs instantly as a guest. Creating an account is optional and may unlock additional features in the future."
            />
            <FAQItem 
                question="Can I use MarvelPDF on my phone?" 
                answer="Absolutely. Our platform is 100% web-based and responsive. It works perfectly on iPhones, Androids, iPads, and Tablets without installing any apps."
            />
        </FAQCategory>

        <FAQCategory title="Security & Privacy" icon={Shield}>
            <FAQItem 
                question="Are my files safe?" 
                answer="Security is our #1 priority. Your files are transferred via encrypted SSL connections. We do not manually check your files. They are processed by automated algorithms."
            />
            <FAQItem 
                question="When is my data deleted?" 
                answer="We implement a strict 'zero-retention' policy. All uploaded files and processed documents are automatically and permanently deleted from our servers within 2 hours."
            />
        </FAQCategory>

        <FAQCategory title="Technical Support" icon={Sliders}>
            <FAQItem 
                question="What is the maximum file size?" 
                answer="Currently, you can upload files up to 50MB per task. We find this covers 99% of PDF needs. If you have larger files, try our 'Compress PDF' tool first!"
            />
             <FAQItem 
                question="Why did my conversion fail?" 
                answer="Conversion failures usually happen if a file is password-protected, corrupted, or extremely complex (e.g., scanned images without text layer). Ensure your file is not encrypted before uploading."
            />
            <FAQItem 
                question="My PDF has weird formatting after conversion." 
                answer="PDF to Word conversion is complex. While we use advanced OCR and layout engines, complex tables or custom fonts may sometimes shift. We are constantly improving our algorithms to handle these edge cases."
            />
        </FAQCategory>

        <div className="bg-[#111] text-white rounded-3xl p-8 md:p-12 text-center relative overflow-hidden border border-white/10 shadow-2xl">
            <div className="relative z-10">
                <h3 className="text-2xl md:text-3xl font-heading mb-4">Still need help?</h3>
                <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                    Our support team is ready to assist you with any specific issues or feature requests.
                </p>
                <a 
                    href="mailto:support@marvelpdf.com" 
                    className="inline-flex items-center px-8 py-4 bg-marvel-red text-white text-lg font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-900/20 transform hover:-translate-y-1 border border-transparent"
                >
                    Email Support
                </a>
            </div>
            
             {/* Abstract lines bg */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-marvel-red/10 rounded-full blur-[80px] pointer-events-none" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
        </div>

      </div>
    </div>
  );
};

export default FAQ;
