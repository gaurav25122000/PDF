import React from 'react';
import { Helmet } from 'react-helmet-async';

const LegalPage = ({ title, date, children }) => (
  <div className="min-h-screen bg-white text-gray-800 pt-24 pb-12 px-4 sm:px-6 lg:px-8 absolute inset-0 z-40 overflow-y-auto">
    <Helmet>
      <title>{title} - MarvelPDF</title>
    </Helmet>
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-4xl font-heading text-marvel-black mb-2">{title}</h1>
      <p className="text-gray-500 mb-8 text-sm">Last updated: {date}</p>
      <div className="prose prose-slate max-w-none prose-headings:font-heading prose-headings:text-marvel-black prose-a:text-marvel-red font-sans">
        {children}
      </div>
    </div>
  </div>
);

const Terms = () => {
  return (
    <LegalPage title="Terms of Service" date="December 29, 2025">
      <h3>1. Acceptance of Terms</h3>
      <p>
        By accessing and using MarvelPDF, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.
      </p>

      <h3>2. Description of Service</h3>
      <p>
        MarvelPDF provides online tools for manipulating PDF documents (merging, splitting, compressing, etc.). We strive for high availability but do not guarantee uninterrupted service.
      </p>

      <h3>3. User Responsibilities</h3>
      <p>
        You are responsible for the content you upload. You agree not to upload:
        <ul>
          <li>Illegal or unlawful content.</li>
          <li>Files that contain malware or viruses.</li>
          <li>Content that infringes on intellectual property rights.</li>
        </ul>
      </p>

      <h3>4. Limitations of Liability</h3>
      <p>
        MarvelPDF is provided "as is". We are not liable for any damages arising from the use of our tools, including but not limited to data loss or corruption. Ideally, always keep a backup of your original files.
      </p>

      <h3>5. Fair Use</h3>
      <p>
        We implement rate limiting to ensure fair access for all users. Attempting to bypass these limits is a violation of these terms.
      </p>
    </LegalPage>
  );
};

export default Terms;
