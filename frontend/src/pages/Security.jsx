import React from 'react';
import { ShieldCheck, Lock, Trash2, Server, EyeOff, FileKey, Globe, RefreshCcw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const SecurityFeature = ({ icon: Icon, title, description, color = "text-marvel-red", bg = "bg-marvel-red/10" }) => (
  <div className="bg-gray-50 p-6 rounded-2xl hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100 group">
    <div className={`w-14 h-14 ${bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      <Icon className={`w-8 h-8 ${color}`} />
    </div>
    <h3 className="font-heading text-xl mb-3 text-marvel-black">{title}</h3>
    <p className="text-gray-500 leading-relaxed text-sm">
      {description}
    </p>
  </div>
);

const Security = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800 pt-20 pb-12 px-4 sm:px-6 lg:px-8 absolute inset-0 z-40 overflow-y-auto">
      <SEO 
        title="Security Overview - How We Protect Your Data" 
        description="Learn about our bank-grade security measures. TLS encryption, ISO 27001 certified servers, and automatic file deletion within 2 hours."
        keywords="pdf security, secure pdf, encrypted file transfer, auto deletion, data privacy"
      />
      
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
            <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-marvel-black transition-colors font-bold">
                <ArrowLeft size={20} /> Back to Tools
            </Link>
        </div>

        <div className="text-center mb-20">
             <h1 className="text-5xl md:text-6xl font-heading text-marvel-black mb-6 tracking-tight">Security is our DNA</h1>
             <p className="text-xl text-gray-500 max-w-3xl mx-auto">
                 We've built MarvelPDF from the ground up with a "Defence in Depth" architecture. 
                 Your privacy and data integrity are not just features; they are foundational requirements.
             </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            <SecurityFeature 
                icon={Trash2} 
                title="Ephemeral Storage" 
                description="We operate a strict 'Zero Retention' policy for processed files. All documents are automatically purged from our servers within 2 hours of processing."
            />
            <SecurityFeature 
                icon={Lock} 
                title="TLS 1.3 Encryption" 
                color="text-blue-600"
                bg="bg-blue-600/10"
                description="Every byte of data transferred between you and MarvelPDF is encrypted using industry-standard TLS 1.3 protocols, ensuring perfect forward secrecy."
            />
            <SecurityFeature 
                icon={Server} 
                title="ISO 27001 Servers" 
                color="text-green-600"
                bg="bg-green-600/10"
                description="Our infrastructure is hosted on AWS and Netlify, both of which are ISO 27001 certified, SOC 2 Type II compliant, and PCI-DSS Level 1 certified."
            />
            <SecurityFeature 
                icon={EyeOff} 
                title="No Human Access" 
                color="text-purple-600"
                bg="bg-purple-600/10"
                description="Our processing pipeline is 100% automated. No human has access to read, view, or modify your specific documents."
            />
        </div>

        {/* Deep Dive Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-20">
            <div>
                <h2 className="text-4xl font-heading text-marvel-black mb-6">End-to-End Protection</h2>
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <FileKey className="text-gray-400 shrink-0 mt-1" size={24} />
                        <div>
                            <h4 className="font-bold text-lg mb-1">Data at Rest</h4>
                            <p className="text-gray-600 text-sm">Even during their short 2-hour lifespan, your files are stored on encrypted disks (AES-256). Metadata records in our database are also encrypted.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <Globe className="text-gray-400 shrink-0 mt-1" size={24} />
                        <div>
                            <h4 className="font-bold text-lg mb-1">Global Compliance</h4>
                            <p className="text-gray-600 text-sm">We are fully compliant with GDPR (Europe) and CCPA (California) regulations. You have full control over your data identity.</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <RefreshCcw className="text-gray-400 shrink-0 mt-1" size={24} />
                        <div>
                            <h4 className="font-bold text-lg mb-1">Continuous Monitoring</h4>
                            <p className="text-gray-600 text-sm">We use automated vulnerability scanning and intrusion detection systems to monitor our infrastructure 24/7/365.</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="bg-marvel-black rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-marvel-red/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
                
                <h3 className="text-2xl font-heading mb-6 relative z-10">Report a Vulnerability</h3>
                <p className="text-gray-400 mb-8 relative z-10">
                    Security researchers play a vital role in keeping the internet safe. 
                    If you believe you've found a security bug in MarvelPDF, please report it to us immediately. 
                    We appreciate your help.
                </p>
                <a href="mailto:marvel.pdf.queries@gmail.com" className="inline-flex items-center justify-center gap-2 bg-white text-marvel-black font-bold py-3 px-6 rounded-xl hover:bg-gray-100 transition-colors relative z-10">
                    <ShieldCheck size={20} /> Contact Security Team
                </a>
            </div>
        </div>

        <div className="border-t border-gray-100 pt-12 text-center">
            <p className="text-gray-500 text-sm">
                Questions about our security practices? Email us at <a href="mailto:marvel.pdf.queries@gmail.com" className="text-marvel-red hover:underline">marvel.pdf.queries@gmail.com</a>
            </p>
        </div>

      </div>
    </div>
  );
};

export default Security;
