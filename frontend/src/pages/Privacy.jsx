import React, { useEffect } from 'react';
import { ArrowLeft, Shield, Lock, Eye, FileText, Server, Globe, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const SectionLink = ({ href, children, icon: Icon }) => (
  <a 
    href={href} 
    className="flex items-center gap-3 p-3 rounded-xl text-gray-400 hover:bg-white/10 hover:text-white transition-all group font-medium text-sm md:text-base border border-transparent hover:border-white/5"
  >
    <div className="p-2 bg-white/5 rounded-lg group-hover:bg-marvel-red/20 group-hover:text-marvel-red transition-all">
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
    <div className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 relative z-10 w-full overflow-hidden">
      <SEO 
        title="Privacy Policy - Your Data is Safe" 
        description="Read the MarvelPDF Privacy Policy. We value your privacy: 2-hour automatic file deletion, no data selling, and full encryption."
        keywords="privacy policy, data protection, automatic deletion, file security, gdpr, ccpa"
      />

      {/* Decorative Background Elements */}
      <div className="fixed top-0 inset-x-0 h-[400px] bg-gradient-to-b from-white/5 to-transparent pointer-events-none -z-10" />
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3 -z-10" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2 -z-10" />

      {/* Navigation Header */}
      <div className="max-w-6xl mx-auto mb-8 md:mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium group text-sm">
          <div className="p-2 bg-white/5 rounded-lg border border-white/10 group-hover:bg-white/10 transition-all">
             <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          Back to Tools
        </Link>
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Last updated: Dec 31, 2025
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Sidebar Navigation - Sticky on Desktop */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="sticky top-24 bg-[#111] backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <h3 className="text-gray-200 font-bold text-sm mb-4 px-3 flex items-center gap-2 uppercase tracking-wider">
                <FileText size={16} className="text-red-500" />
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
          <div className="bg-[#111] rounded-3xl border border-white/10 overflow-hidden">
            
            {/* Header Section */}
            <div className="p-8 md:p-12 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <h1 className="text-3xl md:text-5xl font-heading font-bold text-white mb-6 leading-tight">
                    Privacy Policy
                </h1>
                <p className="text-lg text-gray-400 leading-relaxed max-w-3xl">
                    Trust is the foundation of MarvelPDF. We've built our tools to be powerful, free, and most importantly, <span className="text-white font-semibold">private by design</span>.
                </p>
            </div>
            
            <div className="p-8 md:p-12 space-y-16">
              
              <section id="collect" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                        <Server size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100">1. Information We Collect</h2>
                </div>
                <p className="text-gray-400 text-lg mb-6 leading-relaxed">We believe in <strong className="text-white">data minimization</strong>. We only collect the absolute minimum data required to provide our services to you.</p>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <h4 className="font-bold text-white mb-2 text-sm uppercase tracking-wide">Uploaded Files</h4>
                        <p className="text-sm text-gray-400 m-0 leading-relaxed">Uploaded merely for processing. We claim no ownership and view no content.</p>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <h4 className="font-bold text-white mb-2 text-sm uppercase tracking-wide">Technical Data</h4>
                        <p className="text-sm text-gray-400 m-0 leading-relaxed">Anonymous logs (IP address, browser type) used solely for rate limiting and security.</p>
                    </div>
                </div>
              </section>

              <section id="handling" className="scroll-mt-32">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                        <Shield size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100">2. How We Handle Your Files</h2>
                </div>
                
                <div className="bg-gradient-to-br from-red-600/10 to-orange-600/5 border border-red-500/20 rounded-2xl p-8 mb-8">
                  <h4 className="font-heading text-xl font-bold text-red-400 mb-3 flex items-center gap-2">
                    Our "Zero-Knowledge" Promise
                  </h4>
                  <p className="text-red-100/80 m-0 leading-relaxed">
                    All files you upload are processed by automated machines. <strong className="text-red-50">Human engineers do not have access to your files.</strong> Once processing is complete, your original and converted files are <strong>automatically and permanently deleted</strong> from our servers within <span className="font-bold bg-white/10 px-2 py-0.5 rounded text-white border border-white/10">2 hours</span>. We keep NO backups.
                  </p>
                </div>
                
                <ul className="grid md:grid-cols-2 gap-4 text-gray-400">
                  <li className="bg-white/5 p-3 rounded-lg border border-white/5"><strong className="text-white block mb-1">Transient RAM</strong> Files are processed in volatile memory when possible.</li>
                  <li className="bg-white/5 p-3 rounded-lg border border-white/5"><strong className="text-white block mb-1">Automated Cleanup</strong> Cron jobs run every minute to sweep for old files.</li>
                  <li className="bg-white/5 p-3 rounded-lg border border-white/5"><strong className="text-white block mb-1">Ownership</strong> You retain 100% intellectual property rights.</li>
                  <li className="bg-white/5 p-3 rounded-lg border border-white/5"><strong className="text-white block mb-1">No Mining</strong> We do NOT use your data to train AI models.</li>
                </ul>
              </section>

              <section id="usage" className="scroll-mt-32">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                        <Eye size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100">3. How We Use Your Information</h2>
                </div>
                <p className="text-gray-400 text-lg mb-6">We use the limited data we collect strictly for the following purposes:</p>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                        <h4 className="font-bold text-white mb-2 text-sm uppercase tracking-wide">Service Operation</h4>
                        <p className="text-sm text-gray-400 m-0 leading-relaxed">To perform the specific PDF operations you request (merging, splitting, converting).</p>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                        <h4 className="font-bold text-white mb-2 text-sm uppercase tracking-wide">Security & Abuse</h4>
                        <p className="text-sm text-gray-400 m-0 leading-relaxed">To prevent automated abuse, spam, and DDOS attacks using technical identifiers (IP address).</p>
                    </div>
                </div>
              </section>

              <section id="sharing" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500 border border-teal-500/20">
                        <Users size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100">4. Data Sharing & Disclosure</h2>
                </div>
                <p className="mb-8 text-gray-400 text-lg">We do <strong className="text-white">NOT</strong> sell, rent, or trade your personal data to advertisers. We only share data in these limited scenarios:</p>
                
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="shrink-0 w-1 bg-red-600 rounded-full self-stretch opacity-60"></div>
                        <div>
                            <h4 className="font-bold text-white text-lg">Service Providers</h4>
                            <p className="text-gray-400 mt-1">We use trusted cloud infrastructure providers (e.g., AWS, Netlify) to host our servers and process files. These providers are strictly bound by contract to only process data as instructed by us.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="shrink-0 w-1 bg-red-600 rounded-full self-stretch opacity-60"></div>
                        <div>
                            <h4 className="font-bold text-white text-lg">Legal Requirements</h4>
                            <p className="text-gray-400 mt-1">We may disclose data if compelled by law (e.g., a subpoena or court order), or to protect the rights and safety of our users.</p>
                        </div>
                    </div>
                </div>
              </section>

              <section id="security" className="scroll-mt-32">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                        <Lock size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100">5. Data Security</h2>
                </div>
                <p className="text-gray-400 text-lg mb-6">Security is not an afterthought; it's our core architecture.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <h5 className="font-bold text-white mb-2 text-lg">In Transit</h5>
                    <p className="text-gray-400 text-sm m-0 leading-relaxed">We use industry-standard <strong className="text-gray-200">TLS/SSL (HTTPS)</strong> encryption for all data transfers. Your files are encrypted from the moment they leave your device.</p>
                  </div>
                  <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                    <h5 className="font-bold text-white mb-2 text-lg">At Rest</h5>
                    <p className="text-gray-400 text-sm m-0 leading-relaxed">Any temporary storage uses <strong className="text-gray-200">AES-256 encryption</strong>. Even if a physical disk were stolen, the data would be unreadable.</p>
                  </div>
                </div>
              </section>
              
              <section id="rights" className="scroll-mt-32">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                        <Globe size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100">6. Your Rights</h2>
                </div>
                <p className="text-gray-400 text-lg mb-6">Under laws like <strong className="text-white">GDPR (Europe)</strong> and <strong className="text-white">CCPA (California)</strong>, you have specific rights regarding your data:</p>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                    <ul className="space-y-3 text-gray-400">
                        <li className="flex gap-3"><span className="text-white font-bold">•</span> <span><strong className="text-white">Right to Access:</strong> Know what data we have (it's mostly zero).</span></li>
                        <li className="flex gap-3"><span className="text-white font-bold">•</span> <span><strong className="text-white">Right to Erasure:</strong> Request deletion (we do this auto-magically in 2 hours!).</span></li>
                        <li className="flex gap-3"><span className="text-white font-bold">•</span> <span><strong className="text-white">Right to Opt-Out:</strong> We don't sell data, so you're already opted out.</span></li>
                    </ul>
                </div>
              </section>

              <section id="contact" className="scroll-mt-32 p-8 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-white/10">
                 <h2 className="text-xl font-bold text-white mb-2">Still have questions?</h2>
                <p className="text-gray-400 mb-6 text-sm">
                  Our Data Protection Officer is happy to answer any questions about your privacy.
                </p>
                <div className="inline-flex flex-col">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Email Support</span>
                    <a href="mailto:support@marvelpdf.com" className="text-2xl font-heading font-bold text-white hover:text-red-500 transition-colors">
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
