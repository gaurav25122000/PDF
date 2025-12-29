import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ShieldCheck, Lock, Trash2, Server } from 'lucide-react';

const Security = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800 pt-24 pb-12 px-4 sm:px-6 lg:px-8 absolute inset-0 z-40 overflow-y-auto">
      <Helmet>
        <title>Security - MarvelPDF</title>
      </Helmet>
      
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
             <h1 className="text-5xl font-heading text-marvel-black mb-6">Security at our Core</h1>
             <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                 We treat your files as if they were top secret. Because to you, they are.
             </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
                <div className="bg-marvel-red/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <Trash2 className="text-marvel-red" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-marvel-black">Automatic Deletion</h3>
                <p className="text-gray-600 leading-relaxed">
                    We don't keep what isn't ours. All files uploaded and processed are automatically and permanently deleted from our servers within <strong>2 hours</strong>.
                </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
                <div className="bg-blue-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <Lock className="text-blue-600" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-marvel-black">End-to-End Encryption</h3>
                <p className="text-gray-600 leading-relaxed">
                    Your files are transferred via secure <strong>HTTPS / SSL</strong> connections. This ensures your data remains encrypted and unreadable during transit.
                </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
                <div className="bg-green-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <Server className="text-green-600" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-marvel-black">Secure Infrastructure</h3>
                <p className="text-gray-600 leading-relaxed">
                    Our servers are hosted in ISO 27001 certified data centers. We use secure, ephemeral storage containers for processing each request.
                </p>
            </div>

            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
                <div className="bg-purple-500/10 w-12 h-12 rounded-lg flex items-center justify-center mb-6">
                    <ShieldCheck className="text-purple-600" size={24} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-marvel-black">Data Privacy</h3>
                <p className="text-gray-600 leading-relaxed">
                    We comply with GDPR and strict privacy standards. We do not sell your data or analyze your files for advertising.
                </p>
            </div>
        </div>

        <div className="bg-marvel-black text-white rounded-3xl p-12 text-center">
            <h2 className="text-3xl font-heading mb-4">Have a security concern?</h2>
            <p className="text-gray-400 mb-8">
                If you've found a vulnerability or have a specific compliance question, our engineering team is ready to help.
            </p>
            <a href="mailto:security@marvelpdf.com" className="bg-white text-marvel-black px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors inline-flex items-center gap-2">
                Contact Security Team
            </a>
        </div>

      </div>
    </div>
  );
};

export default Security;
