import React from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/Navbar'; // Wait, Navbar is outside routes in App.jsx. 
// We are inside the main > relative > absolute overlay.
// We just need the content. The Navbar is already visible from App.jsx?
// App.jsx structure: Navbar is separate. Home is absolute inset-0. Routes are relative z-10.
// So if I render this, it appears ON TOP of Home.
// I just need a background color.

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

const Privacy = () => {
  return (
    <LegalPage title="Privacy Policy" date="December 29, 2025">
      <p>
        At MarvelPDF, your privacy is our priority. We are committed to protecting your personal information and your documents. 
        This Privacy Policy explains how we handle your data when you use our PDF tools.
      </p>

      <h3>1. Data We Collect</h3>
      <p>
        We collect minimal data necessary to provide our services:
        <ul>
          <li><strong>Uploaded Files:</strong> Files you upload for processing.</li>
          <li><strong>Usage Data:</strong> Information about how you use our tools (e.g., timestamps, tool type) for rate limiting.</li>
          <li><strong>Account Info:</strong> If you sign up, we store your name and email address securely.</li>
        </ul>
      </p>

      <h3>2. How We Handle Your Files</h3>
      <p>
        Your files are handled with the utmost care:
        <ul>
          <li><strong>Processing Only:</strong> Files are used solely for the requested operation (merge, split, etc.).</li>
          <li><strong>Auto-Deletion:</strong> All uploaded and processed files are keeping in temporary storage and are permanently deleted from our servers within 2 hours of processing.</li>
          <li><strong>No Ownership:</strong> We lay no claim to your content. You retain full ownership of your files.</li>
        </ul>
      </p>

      <h3>3. Cookies</h3>
      <p>
        We use essential cookies to maintain your session (if logged in) and strictly necessary local storage for tool preferences. We do not track you across other sites.
      </p>

      <h3>4. Third-Party Services</h3>
      <p>
        We use trusted cloud providers (like Neon DB, AWS/Netlify) to host our infrastructure. They are bound by strict data protection agreements.
      </p>
    </LegalPage>
  );
};

export default Privacy;
