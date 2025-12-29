import React, { useEffect } from 'react';
import { ArrowLeft, Shield, Lock, Eye, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const SectionLink = ({ href, children, icon: Icon }) => (
  <a 
    href={href} 
    className="flex items-center gap-3 p-3 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-marvel-red transition-all group font-medium"
  >
    <Icon size={18} className="group-hover:scale-110 transition-transform" />
    {children}
  </a>
);

const Privacy = () => {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4 sm:px-6 lg:px-8 absolute inset-0 z-40 overflow-y-auto font-sans">
      <SEO 
        title="Privacy Policy" 
        description="Read the MarvelPDF Privacy Policy. We value your privacy and are transparent about how we collect, use, and protect your data."
        keywords="privacy policy, data protection, gdpr, pdf security"
      />

      {/* Navigation Header */}
      <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-marvel-black transition-colors font-bold">
                <ArrowLeft size={20} /> Back to Tools
            </Link>
            <div className="text-sm text-gray-400 font-medium uppercase tracking-wider">
                Last updated: December 29, 2025
            </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Sidebar Navigation */}
        <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24 space-y-2">
                <h3 className="text-marvel-black font-heading text-lg mb-4 px-3">Contents</h3>
                <SectionLink href="#collect" icon={FileText}>1. Data Collection</SectionLink>
                <SectionLink href="#handling" icon={Shield}>2. File Handling</SectionLink>
                <SectionLink href="#usage" icon={Eye}>3. Usage & Sharing</SectionLink>
                <SectionLink href="#security" icon={Lock}>4. Data Security</SectionLink>
                <SectionLink href="#rights" icon={Shield}>5. Your Rights</SectionLink>
                <SectionLink href="#contact" icon={FileText}>6. Contact Us</SectionLink>
            </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
                <h1 className="text-4xl md:text-5xl font-heading text-marvel-black mb-6">Privacy Policy</h1>
                <p className="text-xl text-gray-600 mb-12 leading-relaxed">
                    At MarvelPDF, safeguarding your privacy and the security of your documents is our absolute highest priority. 
                    This detailed Privacy Policy explains exactly how we collect, use, process, and delete your data.
                </p>
                
                <div className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:text-marvel-black prose-a:text-marvel-red text-gray-600 prose-ul:list-disc prose-ul:pl-0 prose-li:my-2">
                    
                    <section id="collect" className="scroll-mt-24 mb-16">
                        <h2>1. Information We Collect</h2>
                        <p>We believe in data minimization. We only collect what is strictly necessary to provide our services:</p>
                        <ul className="space-y-2 pl-4 border-l-2 border-marvel-red/20 ml-2">
                            <li><strong>Uploaded Documents:</strong> Files are collected solely for the purpose of processing.</li>
                            <li><strong>Usage Data:</strong> Anonymous technical data (IP, browser) for rate limiting.</li>
                            <li><strong>Account Information:</strong> Name, email, and encrypted password if you sign up.</li>
                        </ul>
                    </section>

                    <section id="handling" className="scroll-mt-24 mb-16">
                        <h2>2. How We Handle Your Files (Critical)</h2>
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 not-prose mb-6">
                            <h4 className="font-bold text-marvel-red text-lg mb-2 flex items-center gap-2">
                                <Shield className="fill-current" size={20} /> Our Commitment
                            </h4>
                            <p className="text-gray-700 m-0">
                                All uploaded files and processed outputs are <strong>automatically and permanently deleted</strong> from our servers within <strong>2 hours</strong>. We keep NO backups.
                            </p>
                        </div>
                        <ul>
                            <li><strong>Transient Processing:</strong> Files exist only during processing.</li>
                            <li><strong>No Human Access:</strong> Automated pipelines only. Engineers do not view user files.</li>
                            <li><strong>Ownership:</strong> You retain full intellectual property rights.</li>
                        </ul>
                    </section>

                    <section id="usage" className="scroll-mt-24 mb-16">
                        <h2>3. How We Use Your Information</h2>
                        <p>We use your data strictly to:</p>
                        <ul>
                            <li>Provide and maintain the PDF tools.</li>
                            <li>Detect and prevent abuse (rate limiting).</li>
                            <li>Communicate regarding your account.</li>
                        </ul>
                        <p>We do <strong>not</strong> sell or rent your personal data to advertisers.</p>
                    </section>

                    <section id="security" className="scroll-mt-24 mb-16">
                        <h2>4. Security of Your Data</h2>
                        <p>We employ enterprise-grade security measures:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose my-6">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <h5 className="font-bold text-marvel-black mb-1">In Transit</h5>
                                <p className="text-sm">TLS/SSL Encryption for all data transfers.</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <h5 className="font-bold text-marvel-black mb-1">At Rest</h5>
                                <p className="text-sm">AES-256 Encryption for stored data.</p>
                            </div>
                        </div>
                    </section>
                    
                    <section id="rights" className="scroll-mt-24 mb-16">
                        <h2>5. Your Rights (GDPR & CCPA)</h2>
                        <p>You have the right to access, rectify, or erase your data. Contact us to exercise these rights.</p>
                    </section>

                    <section id="contact" className="scroll-mt-24">
                         <h2>6. Contact Us</h2>
                        <p>
                            Questions about your privacy?
                        </p>
                        <a href="mailto:marvel.pdf.queries@gmail.com" className="no-underline text-marvel-red hover:underline font-bold text-xl block mt-2">
                            marvel.pdf.queries@gmail.com
                        </a>
                    </section>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
