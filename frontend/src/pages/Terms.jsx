import React, { useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertTriangle, Scale, FileText, Gavel, Hand } from 'lucide-react';
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

const Terms = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 relative z-10 w-full overflow-hidden">
      <SEO 
        title="Terms of Service - The Rules" 
        description="Review the Terms of Service for MarvelPDF. Fair usage policy, intellectual property rights, and user responsibilities explained clearly."
        keywords="terms of service, tos, user agreement, fair use, liability"
      />

      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] bg-red-600/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/3 -z-10" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-blue-600/5 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2 -z-10" />

      {/* Navigation Header */}
      <div className="max-w-6xl mx-auto mb-8 md:mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium group text-sm">
          <div className="p-2 bg-white/5 rounded-lg border border-white/10 group-hover:bg-white/10 transition-all">
             <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          Back to Tools
        </Link>
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center justify-center md:justify-end gap-2">
           <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
           Effective: Dec 31, 2025
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Sidebar Navigation */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="sticky top-28 bg-[#111] backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <h3 className="text-gray-200 font-bold text-sm mb-4 px-3 flex items-center gap-2 uppercase tracking-wider">
                <Scale size={16} className="text-red-500" />
                Table of Contents
            </h3>
            <nav className="space-y-1">
                <SectionLink href="#usage" icon={CheckCircle}>1. Fair Usage</SectionLink>
                <SectionLink href="#responsibilities" icon={FileText}>2. Responsibilities</SectionLink>
                <SectionLink href="#ip" icon={Scale}>3. Ownership</SectionLink>
                <SectionLink href="#liability" icon={AlertTriangle}>4. Liability</SectionLink>
                <SectionLink href="#termination" icon={Hand}>5. Termination</SectionLink>
                <SectionLink href="#contact" icon={Gavel}>6. Contact</SectionLink>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          <div className="bg-[#111] rounded-3xl border border-white/10 overflow-hidden">
            
            <div className="p-8 md:p-12 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <h1 className="text-3xl md:text-5xl font-heading font-bold text-white mb-6 leading-tight">
                    Terms of Service
                </h1>
                <p className="text-lg text-gray-400 leading-relaxed max-w-3xl">
                    By using MarvelPDF, you agree to these terms. We've kept them as plain english as possible, because nobody likes legal jargon.
                </p>
            </div>
            
            <div className="p-8 md:p-12 space-y-16">
              
              <section id="usage" className="scroll-mt-32">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20">
                        <CheckCircle size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100">1. Fair Usage Policy</h2>
                </div>
                <p className="text-gray-400 leading-relaxed text-lg mb-6">
                  MarvelPDF provides a powerful suite of tools for free. To keep this service sustainable and fast for everyone, we have some simple rules:
                </p>
                <div className="bg-green-500/5 rounded-xl p-6 border border-green-500/10">
                    <h4 className="font-bold text-green-400 mb-2 text-sm uppercase tracking-wide">Usage Limits</h4>
                    <p className="text-green-100/80 text-sm leading-relaxed">
                       We enforce a fair usage limit of roughly <strong>3 tasks per day</strong> per user. Attempts to bypass this via automation, bots, or multiple accounts are strictly prohibited.
                    </p>
                </div>
              </section>
              
              <section id="responsibilities" className="scroll-mt-32">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                        <FileText size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100">2. Your Responsibilities</h2>
                </div>
                <p className="text-gray-400 leading-relaxed text-lg mb-6">You retain full ownership and responsibility for the content you upload. You agree NOT to upload:</p>
                <ul className="grid md:grid-cols-2 gap-4 text-gray-400">
                  <li className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <strong className="text-white block mb-1">Illegal Content</strong>
                      Files that violate any laws.
                  </li>
                  <li className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <strong className="text-white block mb-1">Malware</strong>
                      Viruses, worms, or malicious code.
                  </li>
                  <li className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <strong className="text-white block mb-1">Hate Speech</strong>
                      Defamatory or infringing material.
                  </li>
                  <li className="bg-white/5 p-3 rounded-lg border border-white/5">
                      <strong className="text-white block mb-1">Stolen Data</strong>
                      Files you do not own rights to.
                  </li>
                </ul>
                <p className="mt-6 text-sm text-gray-500 italic">
                    We do not screen content, but we reserve the right to ban users who violate these terms.
                </p>
              </section>

              <section id="ip" className="scroll-mt-32">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                        <Scale size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100">3. Intellectual Property</h2>
                </div>
                <div className="space-y-4 text-gray-400 text-lg">
                    <p>
                    <strong className="text-white">Your Files:</strong> You own them. Period. We claim no ownership over any document you process.
                    </p>
                    <p>
                    <strong className="text-white">Our Platform:</strong> The MarvelPDF interface, logos, code, and design are owned by us. You cannot copy, reverse-engineer, or rip our design.
                    </p>
                </div>
              </section>

              <section id="liability" className="scroll-mt-32">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20">
                        <AlertTriangle size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100">4. Limitation of Liability</h2>
                </div>
                <div className="p-6 bg-white/5 border border-white/5 rounded-2xl">
                   <p className="text-gray-400 text-sm leading-relaxed mb-4">
                     The Service is provided "AS IS" and "AS AVAILABLE". To the maximum extent permitted by law, MarvelPDF disclaims all warranties. We are not liable for any damages, data loss, or lost profits resulting from your use (or inability to use) our tools.
                   </p>
                   <p className="text-gray-500 text-xs">
                       (Basically: We try our best, but computers are weird. Always backup your original files.)
                   </p>
                </div>
              </section>

              <section id="termination" className="scroll-mt-32">
                 <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                        <Hand size={20} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-100">5. Termination</h2>
                </div>
                 <p className="text-gray-400 text-lg">
                  We reserve the right to suspend or ban your access to MarvelPDF immediately, without prior notice, if you violate these Terms (e.g., abusing the API, uploading malware).
                 </p>
              </section>

              <section id="contact" className="scroll-mt-32 p-8 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-white/10">
                 <h2 className="text-xl font-bold text-white mb-2">Questions regarding Terms?</h2>
                <p className="text-gray-400 mb-6 text-sm">
                  If any part of these terms is unclear, please contact legal support.
                </p>
                <div className="inline-flex flex-col">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Email Legal</span>
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

export default Terms;
