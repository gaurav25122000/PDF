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

const Terms = () => {
  return (
    <LegalPage title="Terms of Service" date="December 29, 2025">
      <p className="lead">
        Welcome to MarvelPDF. By accessing or using our website and services, you agree to be bound by these Terms of Service. 
        Please read them carefully. If you do not agree with any part of these terms, you must not use our services.
      </p>

      <h2>1. Definitions</h2>
      <p>
        "Service" refers to the MarvelPDF website and all PDF processing tools provided therein.<br/>
        "User", "You", and "Your" refers to the individual or entity accessing or using the Service.<br/>
        "We", "Us", and "Our" refers to MarvelPDF.
      </p>

      <h2>2. Use of Service</h2>
      <p>
        MarvelPDF grants you a limited, non-exclusive, non-transferable, and revocable license to use our Service for your personal or internal business purposes, subject to these Terms.
      </p>
      <h3>2.1 Eligibility</h3>
      <p>You must be at least 13 years old to use this Service. By using the Service, you represent that you meet this requirement.</p>
      <h3>2.2 Usage Limits</h3>
      <p>
        We enforce a fair usage policy of <strong>3 tasks per day</strong> for all users. You agree not to attempt to bypass these limits using automated scripts, multiple accounts, or IP spoofing.
      </p>

      <h2>3. User Responsibilities & Content</h2>
      <p>
        You are solely responsible for the files you upload and the consequences of processing them.
      </p>
      <ul>
        <li><strong>Lawful Use:</strong> You agree not to upload content that illegal, harmful, threatening, abusive, harassment, defamatory, vulgar, obscene, or racially/ethically objectionable.</li>
        <li><strong>Intellectual Property:</strong> You represent that you have the necessary rights and permissions to use and process the files you upload. You do not transfer ownership of your content to us.</li>
        <li><strong>Malware:</strong> You must not upload files that contain viruses, trojans, worms, or any other malicious code.</li>
      </ul>

      <h2>4. Intellectual Property Rights</h2>
      <p>
        The MarvelPDF website, its original content, features, functionality, design, and code are owned by MarvelPDF and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
      </p>

      <h2>5. Termination</h2>
      <p>
        We may terminate or suspend your access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
      </p>

      <h2>6. Disclaimer of Warranties</h2>
      <p className="uppercase font-bold text-sm bg-gray-100 p-4 rounded-lg border border-gray-200">
        The Service is provided on an "AS IS" and "AS AVAILABLE" basis. MarvelPDF makes no representations or warranties of any kind, express or implied, regarding the operation of the Service or the information, content, or materials included therein. To the full extent permissible by applicable law, MarvelPDF disclaims all warranties, express or implied, including, but not limited to, implied warranties of merchantability and fitness for a particular purpose. You expressly agree that your use of the Service is at your sole risk.
      </p>

      <h2>7. Limitation of Liability</h2>
      <p>
        In no event shall MarvelPDF, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use or alteration of your transmissions or content, whether based on warranty, contract, tort (including negligence) or any other legal theory.
      </p>

      <h2>8. Indemnification</h2>
      <p>
        You agree to defend, indemnify and hold harmless MarvelPDF and its licensee and licensors, and their employees, contractors, agents, officers and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees), resulting from or arising out of a) your use and access of the Service, or b) a breach of these Terms.
      </p>

      <h2>9. Governing Law</h2>
      <p>
        These Terms shall be governed and construed in accordance with the laws, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
      </p>

      <h2>10. Contact Us</h2>
      <p>
        If you have any questions about these Terms, please contact us at:
      </p>
      <p className="font-bold text-marvel-red text-xl">
        marvel.pdf.queries@gmail.com
      </p>
    </LegalPage>
  );
};

export default Terms;
