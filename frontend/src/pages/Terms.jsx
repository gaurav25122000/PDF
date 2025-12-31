import React, { useEffect } from 'react';
import { ArrowLeft, CheckCircle, AlertTriangle, Scale, FileText, Gavel, Hand } from 'lucide-react';
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

const Terms = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <SEO 
        title="Terms of Service - The Rules of the Game" 
        description="Review the Terms of Service for MarvelPDF. Fair usage policy, intellectual property rights, and user responsibilities explained clearly."
        keywords="terms of service, tos, user agreement, fair use, liability"
      />

      {/* Decorative Background Elements */}
      <div className="fixed top-0 inset-x-0 h-[400px] bg-gradient-to-b from-white to-gray-50 pointer-events-none -z-10" />
      <div className="fixed top-0 left-0 w-[600px] h-[600px] bg-marvel-red/5 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/3 -z-10" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-indigo-50 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2 -z-10" />

      {/* Navigation Header */}
      <div className="max-w-6xl mx-auto mb-8 md:mb-12 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-marvel-black transition-colors font-bold group">
          <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-all border border-gray-100">
             <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </div>
          <span className="text-sm md:text-base">Back to Tools</span>
        </Link>
        <div className="text-xs md:text-sm text-center md:text-right text-gray-400 font-medium uppercase tracking-wider flex items-center justify-center md:justify-end gap-2">
           <span className="w-2 h-2 rounded-full bg-marvel-red"></span>
           Effective Date: December 31, 2025
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Sidebar Navigation */}
        <div className="hidden lg:block lg:col-span-3">
          <div className="sticky top-24 bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white/50 shadow-sm">
            <h3 className="text-marvel-black font-heading text-lg mb-4 px-3 flex items-center gap-2">
                <Scale size={20} className="text-marvel-red" />
                Sections
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
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            
            <div className="p-6 md:p-12 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
                <h1 className="text-3xl md:text-5xl font-heading text-marvel-black mb-6 leading-tight">
                    Terms of Service
                </h1>
                <p className="text-lg md:text-xl text-gray-500 leading-relaxed max-w-3xl">
                    By using MarvelPDF, you agree to these terms. We've kept them as plain english as possible, because nobody likes legal jargon.
                </p>
            </div>
            
            <div className="p-6 md:p-12 prose prose-lg max-w-none prose-headings:font-heading prose-headings:text-marvel-black prose-p:text-gray-600 prose-li:text-gray-600">
              
              <section id="usage" className="scroll-mt-32 mb-12 md:mb-16">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                        <CheckCircle size={24} />
                    </div>
                    <h2 className="m-0 text-2xl md:text-3xl">1. Fair Usage Policy</h2>
                </div>
                <p>
                  MarvelPDF provides a powerful suite of tools for free. To keep this service sustainable and fast for everyone, we have some simple rules:
                </p>
                <div className="bg-green-50 rounded-2xl p-6 border border-green-100 not-prose mt-6">
                    <h4 className="font-bold text-green-900 mb-2">Usage Limits</h4>
                    <p className="text-gray-700 m-0">
                       We enforce a fair usage limit of roughly <strong>3 tasks per day</strong> per user. Attempts to bypass this via automation, bots, or multiple accounts are strictly prohibited.
                    </p>
                </div>
              </section>
              
              <section id="responsibilities" className="scroll-mt-32 mb-12 md:mb-16">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <FileText size={24} />
                    </div>
                    <h2 className="m-0 text-2xl md:text-3xl">2. Your Responsibilities</h2>
                </div>
                <p>You retain full ownership and responsibility for the content you upload. You agree NOT to upload:</p>
                <ul className="grid md:grid-cols-2 gap-x-4 gap-y-2">
                  <li><strong>Illegal Content:</strong> Files that violate any laws.</li>
                  <li><strong>Malware:</strong> Viruses, worms, or malicious code.</li>
                  <li><strong>Hate Speech:</strong> Defamatory or infringing material.</li>
                  <li><strong>Stolen Data:</strong> Files you do not own rights to.</li>
                </ul>
                <p className="text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                    We do not screen content, but we reserve the right to ban users who violate these terms.
                </p>
              </section>

              <section id="ip" className="scroll-mt-32 mb-12 md:mb-16">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <Scale size={24} />
                    </div>
                    <h2 className="m-0 text-2xl md:text-3xl">3. Intellectual Property</h2>
                </div>
                <p>
                  <strong>Your Files:</strong> You own them. Period. We claim no ownership over any document you process.
                </p>
                <p>
                  <strong>Our Platform:</strong> The MarvelPDF interface, logos, code, and design are owned by us. You cannot copy, reverse-engineer, or rip our design.
                </p>
              </section>

              <section id="liability" className="scroll-mt-32 mb-12 md:mb-16">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                        <AlertTriangle size={24} />
                    </div>
                    <h2 className="m-0 text-2xl md:text-3xl">4. Limitation of Liability</h2>
                </div>
                <div className="p-6 bg-gray-50 border border-gray-200 rounded-2xl text-base not-prose">
                   <p className="m-0 text-gray-700">
                     The Service is provided "AS IS" and "AS AVAILABLE". To the maximum extent permitted by law, MarvelPDF disclaims all warranties. We are not liable for any damages, data loss, or lost profits resulting from your use (or inability to use) our tools.
                   </p>
                   <p className="mt-4 m-0 text-gray-500 text-sm">
                       (Basically: We try our best, but computers are weird. Always backup your original files.)
                   </p>
                </div>
              </section>

              <section id="termination" className="scroll-mt-32 mb-12 md:mb-16">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                        <Hand size={24} />
                    </div>
                    <h2 className="m-0 text-2xl md:text-3xl">5. Termination</h2>
                </div>
                 <p>
                  We reserve the right to suspend or ban your access to MarvelPDF immediately, without prior notice, if you violate these Terms (e.g., abusing the API, uploading malware).
                 </p>
              </section>

              <section id="contact" className="scroll-mt-32 p-8 md:p-10 rounded-3xl bg-gray-900 text-white not-prose">
                 <h2 className="text-2xl font-bold text-white mb-4">Questions regarding Terms?</h2>
                <p className="text-gray-300 mb-6">
                  If any part of these terms is unclear, please contact legal support.
                </p>
                <div className="inline-flex flex-col">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Email Legal</span>
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

export default Terms;
