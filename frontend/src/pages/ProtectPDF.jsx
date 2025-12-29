import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import { File, Loader2, Download, ShieldCheck } from 'lucide-react';
import axios from 'axios';

const ProtectPDF = () => {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = (fileList) => {
    if (fileList.length > 0) {
        setFile(fileList[0]);
        setError(null);
    }
  };

  const processFile = async () => {
    if (!file || !password) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("password", password);

    try {
        const response = await axios.post('/api/process/protect', formData, {
            responseType: 'blob',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'protected.pdf');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.dispatchEvent(new Event('usage-updated'));
    } catch (err) {
        console.error("Protect error:", err);
        setError("Failed to protect PDF.");
    } finally {
        setLoading(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Protect PDF - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Protect PDF files with strong passwords online for free. Encrypt your documents securely.",
    "featureList": "PDF Encryption, Password Protection, Secure"
  };

  return (
    <ToolModal title="Protect PDF file">
      <SEO 
        title="Protect PDF - Encrypt PDF with Password" 
        description="Encrypt your PDF file with a password to prevent unauthorized access. Protect PDF documents online for free. Secure banking-level encryption."
        keywords="protect pdf, encrypt pdf, password protect pdf, secure pdf, lock pdf"
        schema={jsonLd}
      />
      
      <p className="text-gray-500 mb-6 text-center">
        Lock your PDF with a superhero-strength password.
      </p>

      {!file ? (
        <div className="w-full">
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".pdf" />
        </div>
      ) : (
        <div className="w-full max-w-lg mx-auto">
             <div className="flex flex-col items-center justify-center p-6 bg-gray-50 border rounded-xl mb-6 relative group">
                <File className="w-16 h-16 text-marvel-red mb-2" />
                <span className="font-medium text-gray-700">{file.name}</span>
                <button 
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-marvel-red p-1"
                >
                    ✕
                </button>
            </div>
             
             <div className="mb-6">
                <label className="block text-gray-700 font-bold mb-2">Set Password:</label>
                <input 
                    type="password" 
                    placeholder="Enter strong password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-marvel-red focus:border-red-500 outline-none transition"
                />
             </div>
             
            {error && (
                <div className="mb-4 text-marvel-red font-medium text-center">
                    {error}
                </div>
            )}

            <div className="text-center sticky bottom-0 bg-white pt-2">
                <button 
                    onClick={processFile}
                    disabled={loading || !password}
                    className={`bg-marvel-red text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-red-700 transition shadow-lg flex items-center justify-center mx-auto gap-2 w-full
                        ${loading || !password ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Encrypting...
                        </>
                    ) : (
                        <>
                            Protect PDF <ShieldCheck className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default ProtectPDF;
