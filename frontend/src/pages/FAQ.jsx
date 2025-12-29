import React from 'react';
import { Plus, Minus, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const FAQItem = ({ question, answer }) => {
  // ...
};

const FAQ = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800 pt-20 pb-12 px-4 sm:px-6 lg:px-8 absolute inset-0 z-40 overflow-y-auto">
      <SEO 
        title="Frequently Asked Questions - Support" 
        description="Find answers to common questions about MarvelPDF. Learn about our free limits, file safety, and supported formats."
        keywords="faq, help, support, pdf questions, pdf help"
      />
      
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-marvel-black transition-colors font-bold mb-8">
            <ArrowLeft size={20} /> Back to Tools
        </Link>
        <h1 className="text-4xl font-heading text-marvel-black mb-8 text-center">Frequently Asked Questions</h1>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-2">
            <FAQItem 
                question="Is MarvelPDF free to use?" 
                answer="Yes! MarvelPDF provides free access to all our PDF tools. We have a daily limit of 3 tasks for all users to ensure fair usage."
            />
            <FAQItem 
                question="Are my files safe?" 
                answer="Absolutely. Your files are transferred via secure SSL encryption and are automatically deleted from our servers within 2 hours of processing. We do not look at or share your documents."
            />
            <FAQItem 
                question="Do I need to install software?" 
                answer="No. MarvelPDF runs entirely in your web browser. You can use it on any device (Mac, Windows, Linux, Mobile) without installing anything."
            />
            <FAQItem 
                question="Why is there a usage limit?" 
                answer="We operate high-performance servers to process your files quickly. Limits help us maintain this speed and availability for everyone for free."
            />
            <FAQItem 
                question="How can I contact support?" 
                answer="You can reach our support team at marvel.pdf.queries@gmail.com. We typically respond within 24 hours."
            />
        </div>
      </div>
    </div>
  );
};

export default FAQ;
