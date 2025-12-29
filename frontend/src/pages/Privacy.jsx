import React from 'react';
import { Helmet } from 'react-helmet-async';

const LegalPage = ({ title, date, children }) => (
  <div className="min-h-screen bg-white text-gray-800 pt-24 pb-12 px-4 sm:px-6 lg:px-8 absolute inset-0 z-40 overflow-y-auto">
    <Helmet>
      <title>{title} - MarvelPDF</title>
    </Helmet>
    <div className="max-w-4xl mx-auto bg-white p-12 rounded-2xl shadow-sm border border-gray-100">
      <h1 className="text-4xl font-heading text-marvel-black mb-4">{title}</h1>
      <div className="w-20 h-1 bg-marvel-red mb-6"></div>
      <p className="text-gray-500 mb-12 text-sm uppercase tracking-wide font-bold">Last updated: {date}</p>
      <div className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:text-marvel-black prose-a:text-marvel-red font-sans text-gray-600">
        {children}
      </div>
    </div>
  </div>
);

const Privacy = () => {
  return (
    <LegalPage title="Privacy Policy" date="December 29, 2025">
      <p className="lead">
        At MarvelPDF, safeguarding your privacy and the security of your documents is our absolute highest priority. 
        This detailed Privacy Policy explains exactly how we collect, use, process, and delete your data when you use our website and services.
      </p>

      <h2>1. Information We Collect</h2>
      <p>We believe in data minimization. We only collect what is strictly necessary to provide our services:</p>
      <ul>
        <li><strong>Uploaded Documents:</strong> When you use our tools (e.g., Merge, Split, Convert), you upload files to our servers. These files are collected solely for the purpose of performing the requested operation.</li>
        <li><strong>Usage Data:</strong> We collect anonymous technical data such as your IP address, browser type, device type, and timestamps. This is used strictly for rate limiting (fair usage policy) and preventing abuse.</li>
        <li><strong>Account Information:</strong> If you choose to create an account, we collect your name, email address, and an encrypted version of your password.</li>
        <li><strong>Cookies:</strong> We use essential cookies to maintain your login session and store non-identifiable user preferences.</li>
      </ul>

      <h2>2. How We Handle Your Files (Critical)</h2>
      <p>We understand that your files may contain sensitive, personal, or confidential information. Here is our binding commitment to you:</p>
      <ul>
        <li><strong>Transient Processing:</strong> Your files are stored on our secure servers only for the duration of the processing task.</li>
        <li><strong>Automatic Deletion:</strong> All uploaded files and the resulting processed files are automatically and permanently deleted from our servers within <strong>2 hours</strong>. We do not keep backups of your files.</li>
        <li><strong>No Human Access:</strong> Our file processing is fully automated. No MarvelPDF employee or third party views the content of your files unless explicitly required by law.</li>
        <li><strong>Ownership:</strong> You retain full intellectual property rights and ownership of your files at all times. MarvelPDF claims no ownership over your content.</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <p>We use your data for the following purposes:</p>
      <ul>
        <li>To provide, operate, and maintain our PDF tools.</li>
        <li>To improve, personalize, and expand our website's functionality.</li>
        <li>To detect and prevent fraudulent use or abuse of our services.</li>
        <li>To communicate with you, specifically regarding your account or customer support inquiries.</li>
      </ul>

      <h2>4. Data Sharing and Third Parties</h2>
      <p>
        We do <strong>not</strong> sell, trade, or rent your personal identification information to others. 
        We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners.
      </p>
      <p>We use trusted third-party infrastructure providers to host our service:</p>
      <ul>
        <li><strong>Netlify / AWS:</strong> For hosting our static website and serverless functions.</li>
        <li><strong>Neon:</strong> For our secure database infrastructure.</li>
      </ul>
      <p>These providers adhere to strict data security standards (ISO 27001, SOC 2).</p>

      <h2>5. Security of Your Data</h2>
      <p>
        We employ enterprise-grade security measures to protect your data:
      </p>
      <ul>
        <li><strong>Encryption in Transit:</strong> All data transferred between your device and our servers is encrypted using TLS/SSL (Transport Layer Security).</li>
        <li><strong>Encryption at Rest:</strong> Sensitive user data (like passwords) is hashed using strong cryptographic algorithms (bcrypt).</li>
        <li><strong>Access Controls:</strong> Access to infrastructure is strictly limited to authorized engineering personnel.</li>
      </ul>

      <h2>6. Your Data Protection Rights (GDPR & CCPA)</h2>
      <p>Depending on your location, you may have the following rights:</p>
      <ul>
        <li><strong>Right to Access:</strong> You have the right to request copies of your personal data.</li>
        <li><strong>Right to Rectification:</strong> You may request that we correct any information you believe is inaccurate.</li>
        <li><strong>Right to Erasure:</strong> You can request that we delete your personal data (Account deletion).</li>
        <li><strong>Right to Restrict Processing:</strong> You have the right to object to our processing of your personal data.</li>
      </ul>

      <h2>7. Children's Information</h2>
      <p>
        MarvelPDF does not knowingly collect any Personal Identifiable Information from children under the age of 13. 
        If you think that your child provided this kind of information on our website, we strongly encourage you to contact us immediately, and we will do our best efforts to promptly remove such information from our records.
      </p>

      <h2>8. Changes to This Privacy Policy</h2>
      <p>
        We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
      </p>

      <h2>9. Contact Us</h2>
      <p>
        If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
      </p>
      <p className="font-bold text-marvel-red text-xl">
        marvel.pdf.queries@gmail.com
      </p>
    </LegalPage>
  );
};

export default Privacy;
