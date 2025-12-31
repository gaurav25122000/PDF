import React, { useEffect } from 'react';
import { ArrowLeft, Shield, Lock, Eye, FileText, Server, Globe, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const SectionLink = ({ href, children, icon: Icon }) => (
  <a 
    href={href} 
    className="flex items-center gap-3 p-3 rounded-xl text-gray-600 hover:bg-gray-50 hover:text-marvel-red transition-all group font-medium text-sm md:text-base"
  >
    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
        <Icon size={18} className="group-hover:scale-110 transition-transform" />
    </div>
    {children}
  </a>
);

const Privacy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <SEO 
        title="Privacy Policy - Your Data is Safe" 
        description="Read the MarvelPDF Privacy Policy. We value your privacy: 2-hour automatic file deletion, no data selling, and full encryption."
        keywords="privacy policy, data protection, automatic deletion, file security, gdpr, ccpa"
      />

      {/* Decorative Background Elements */}
      <div className="fixed top-0 inset-x-0 h-[400px] bg-gradient-to-b from-white to-gray-50 pointer-events-none -z-10" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-marvel-red/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3 -z-10" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-blue-50 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2 -z-10" />

      {/* Navigation Header */}
      <div className="max-w-6xl mx-auto mb-8 md:mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-marvel-black transition-colors font-bold group">
          <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-all border border-gray-100">
             <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="text-sm md:text-base">Back to Tools</span>
        </Link>
        <div className="text-xs md:text-sm text-gray-400 font-medium uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Last updated: December 31, 2025
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Sidebar Navigation - Sticky on Desktop */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="sticky top-24 bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white/50 shadow-sm">
            <h3 className="text-marvel-black font-heading text-lg mb-4 px-3 flex items-center gap-2">
                <FileText size={20} className="text-marvel-red" />
                Contents
            </h3>
            <nav className="space-y-1">
                <SectionLink href="#collect" icon={Server}>1. Data Collection</SectionLink>
                <SectionLink href="#handling" icon={Shield}>2. File Handling</SectionLink>
                <SectionLink href="#usage" icon={Eye}>3. Usage</SectionLink>
                <SectionLink href="#sharing" icon={Users}>4. Sharing</SectionLink>
                <SectionLink href="#security" icon={Lock}>5. Data Security</SectionLink>
                <SectionLink href="#rights" icon={Globe}>6. Your Rights</SectionLink>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            
            {/* Header Section */}
            <div className="p-6 md:p-12 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
                <h1 className="text-3xl md:text-5xl font-heading text-marvel-black mb-6 leading-tight">
                    Privacy Policy
                </h1>
                <p className="text-lg md:text-xl text-gray-500 leading-relaxed max-w-3xl">
                    Trust is the foundation of MarvelPDF. We've built our tools to be powerful, free, and most importantly, <span className="text-marvel-black font-semibold">private by design</span>.
                </p>
            </div>
            
            <div className="p-6 md:p-12 prose prose-lg max-w-none prose-headings:font-heading prose-headings:text-marvel-black prose-p:text-gray-600 prose-a:text-marvel-red prose-a:no-underline hover:prose-a:underline prose-li:text-gray-600">
              
              <section id="collect" className="scroll-mt-32 mb-12 md:mb-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Server size={24} />
                    </div>
                    <h2 className="m-0 text-2xl md:text-3xl">1. Information We Collect</h2>
                </div>
                <p>We believe in <strong>data minimization</strong>. We only collect the absolute minimum data required to provide our services to you.</p>
                <div className="grid md:grid-cols-2 gap-4 not-prose mt-6">
                    <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-2">Uploaded Files</h4>
                        <p className="text-sm text-gray-600 m-0">Uploaded merely for processing. We claim no ownership and view no content.</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-2">Technical Data</h4>
                        <p className="text-sm text-gray-600 m-0">Anonymous logs (IP address, browser type) used solely for rate limiting and security.</p>
                    </div>
                </div>
              </section>

              <section id="handling" className="scroll-mt-32 mb-12 md:mb-16">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-marvel-red">
                        <Shield size={24} />
                    </div>
                    <h2 className="m-0 text-2xl md:text-3xl">2. How We Handle Your Files</h2>
                </div>
                
                <div className="bg-gradient-to-br from-marvel-red/5 to-orange-50/50 border border-marvel-red/10 rounded-2xl p-6 md:p-8 not-prose mb-8">
                  <h4 className="font-heading text-xl text-marvel-red mb-3 flex items-center gap-2">
                    Our "Zero-Knowledge" Promise
                  </h4>
                  <p className="text-gray-800 m-0 leading-relaxed">
                    All files you upload are processed by automated machines. <strong>Human engineers do not have access to your files.</strong> Once processing is complete, your original and converted files are <strong>automatically and permanently deleted</strong> from our servers within <span className="font-bold bg-white px-2 py-0.5 rounded shadow-sm">2 hours</span>. We keep NO backups.
                  </p>
                </div>
                
                <ul className="grid md:grid-cols-2 gap-x-8 gap-y-2">
                  <li><strong>Transient RAM:</strong> Files are processed in volatile memory when possible.</li>
                  <li><strong>Automated Cleanup:</strong> Cron jobs run every minute to sweep for old files.</li>
                  <li><strong>Ownership:</strong> You retain 100% intellectual property rights.</li>
                  <li><strong>No Mining:</strong> We do NOT use your data to train AI models.</li>
                </ul>
              </section>

              <section id="usage" className="scroll-mt-32 mb-12 md:mb-16">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <Eye size={24} />
                    </div>
                    <h2 className="m-0 text-2xl md:text-3xl">3. How We Use Your Information</h2>
                </div>
                <p>We use the limited data we collect strictly for the following purposes:</p>
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-2">Service Operation</h4>
                        <p className="text-sm text-gray-600 m-0">To perform the specific PDF operations you request (merging, splitting, converting).</p>
                    </div>
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-2">Security & Abuse</h4>
                        <p className="text-sm text-gray-600 m-0">To prevent automated abuse, spam, and DDOS attacks using technical identifiers (IP address).</p>
                    </div>
                </div>
              </section>

              <section id="sharing" className="scroll-mt-32 mb-12 md:mb-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                        <Users size={24} />
                    </div>
                    <h2 className="m-0 text-2xl md:text-3xl">4. Data Sharing & Disclosure</h2>
                </div>
                <p className="mb-4">We do <strong>NOT</strong> sell, rent, or trade your personal data to advertisers. We only share data in these limited scenarios:</p>
                
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="shrink-0 w-1.5 bg-marvel-red rounded-full self-stretch"></div>
                        <div>
                            <h4 className="font-bold text-gray-900 text-lg">Service Providers</h4>
                            <p className="text-gray-600">We use trusted cloud infrastructure providers (e.g., AWS, Netlify) to host our servers and process files. These providers are strictly bound by contract to only process data as instructed by us.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="shrink-0 w-1.5 bg-marvel-red rounded-full self-stretch"></div>
                        <div>
                            <h4 className="font-bold text-gray-900 text-lg">Legal Requirements</h4>
                            <p className="text-gray-600">We may disclose data if compelled by law (e.g., a subpoena or court order), or to protect the rights and safety of our users.</p>
                        </div>
                    </div>
                </div>
              </section>

              <section id="security" className="scroll-mt-32 mb-12 md:mb-16">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                        <Lock size={24} />
                    </div>
                    <h2 className="m-0 text-2xl md:text-3xl">5. Data Security</h2>
                </div>
                <p>Security is not an afterthought; it's our core architecture.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose my-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h5 className="font-bold text-marvel-black mb-2 text-lg">In Transit</h5>
                    <p className="text-gray-600 text-sm m-0">We use industry-standard <strong>TLS/SSL (HTTPS)</strong> encryption for all data transfers. Your files are encrypted from the moment they leave your device.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <h5 className="font-bold text-marvel-black mb-2 text-lg">At Rest</h5>
                    <p className="text-gray-600 text-sm m-0">Any temporary storage uses <strong>AES-256 encryption</strong>. Even if a physical disk were stolen, the data would be unreadable.</p>
                  </div>
                </div>
              </section>
              
              <section id="rights" className="scroll-mt-32 mb-12 md:mb-16">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Globe size={24} />
                    </div>
                    <h2 className="m-0 text-2xl md:text-3xl">6. Your Rights</h2>
                </div>
                <p>Under laws like <strong>GDPR (Europe)</strong> and <strong>CCPA (California)</strong>, you have specific rights regarding your data:</p>
                <ul>
                    <li><strong>Right to Access:</strong> Know what data we have (it's mostly zero).</li>
                    <li><strong>Right to Erasure:</strong> Request deletion (we do this auto-magically in 2 hours!).</li>
                    <li><strong>Right to Opt-Out:</strong> We don't sell data, so you're already opted out.</li>
                </ul>
              </section>

              <section id="contact" className="scroll-mt-32 p-8 md:p-10 rounded-3xl bg-gray-900 text-white not-prose">
                 <h2 className="text-2xl font-bold text-white mb-4">Still have questions?</h2>
                <p className="text-gray-300 mb-6">
                  Our Data Protection Officer is happy to answer any questions about your privacy.
                </p>
                <div className="inline-flex flex-col">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Email Support</span>
                    <a href="mailto:support@marvelpdf.com" className="text-2xl md:text-3xl font-heading font-bold text-white hover:text-marvel-red transition-colors">
                    support@marvelpdf.com
                    </a>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
