import React, { useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertTriangle, Scale, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const SectionLink = ({ href, children, icon: Icon }) => (
  <a 
    href={href} 
    className="flex items-center gap-3 p-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-marvel-red transition-all group font-medium"
  >
    <Icon size={18} className="group-hover:scale-110 transition-transform" />
    {children}
  </a>
);

const Terms = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-800 pt-20 pb-12 px-4 sm:px-6 lg:px-8 absolute inset-0 z-40 overflow-y-auto">
      <SEO 
        title="Terms of Service" 
        description="Review the Terms of Service for MarvelPDF. Understand your rights and responsibilities when using our free PDF tools."
        keywords="terms of service, tos, user agreement, legal"
      />

      {/* Background Gradients */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-marvel-red/5 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-50 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2" />

      {/* Navigation Header */}
      <div className="max-w-7xl mx-auto mb-12 flex items-center justify-between relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-marvel-black transition-colors font-bold">
          <ArrowLeft size={20} /> Back to Tools
        </Link>
        <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
          Last updated: December 29, 2025
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
        
        {/* Sidebar Navigation */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="sticky top-24 space-y-2">
            <h3 className="text-marvel-black font-heading text-lg mb-4 px-3">Sections</h3>
            <SectionLink href="#usage" icon={CheckCircle}>1. Use of Service</SectionLink>
            <SectionLink href="#responsibilities" icon={FileText}>2. Responsibilities</SectionLink>
            <SectionLink href="#ip" icon={Scale}>3. Intellectual Property</SectionLink>
            <SectionLink href="#liability" icon={AlertTriangle}>4. Liability</SectionLink>
            <SectionLink href="#contact" icon={FileText}>5. Contact</SectionLink>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          <div className="bg-white/80 backdrop-blur-sm p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
            <h1 className="text-4xl md:text-6xl font-heading text-marvel-black mb-6">Terms of Service</h1>
            <p className="text-xl text-gray-500 mb-12 leading-relaxed">
              By accessing MarvelPDF, you agree to these terms. Read them carefully—they govern your use of our PDF tools.
            </p>
            
            <div className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:text-marvel-black text-gray-600 prose-ul:list-disc prose-ul:pl-0 prose-li:my-2">
              
              <section id="usage" className="scroll-mt-32 mb-16">
                <h2>1. Use of Service</h2>
                <p>
                  MarvelPDF grants you a limited, non-exclusive license to use our Service for personal or internal business purposes.
                </p>
                <h3>Usage Limits</h3>
                <p>
                  We enforce a fair usage policy of <strong>3 tasks per day</strong>. Attempts to bypass this limit using automation or multiple accounts are a violation of these terms.
                </p>
              </section>
              
              <section id="responsibilities" className="scroll-mt-32 mb-16">
                <h2>2. User Responsibilities</h2>
                <p>You are solely responsible for the content you upload.</p>
                <ul className="pl-4 border-l-2 border-marvel-red/20 ml-2">
                  <li><strong>Lawful Use:</strong> No illegal, defamatory, or malicious content.</li>
                  <li><strong>Ownership:</strong> You must own the rights to your files.</li>
                  <li><strong>Malware:</strong> No uploading viruses or harmful code.</li>
                </ul>
              </section>

              <section id="ip" className="scroll-mt-32 mb-16">
                 <h2>3. Intellectual Property</h2>
                 <p>
                  We own the MarvelPDF platform code and design. You own your uploaded files. We make no claim to your documents.
                 </p>
              </section>

              <section id="liability" className="scroll-mt-32 mb-16">
                <h2>4. Limitation of Liability</h2>
                <div className="bg-gray-50/50 p-6 rounded-xl text-sm border border-gray-200">
                   The Service is provided "AS IS". To the extent permitted by law, MarvelPDF disclaims all warranties. We are not liable for any data loss, profit loss, or damages arising from your use of the service.
                </div>
              </section>

              <section id="contact" className="scroll-mt-32">
                <h2>5. Contact Us</h2>
                <p>Questions about these Terms?</p>
                 <a href="mailto:support@marvelpdf.com" className="no-underline text-marvel-red hover:underline font-bold text-xl block mt-2">
                  support@marvelpdf.com
                </a>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
