import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import { File, Loader2, Stamp } from 'lucide-react';
import axios from 'axios';

const WatermarkPDF = () => {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("Confidential");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = (fileList) => {
    if (fileList.length > 0) {
        setFile(fileList[0]);
        setError(null);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    // Passing text as query param for simplicity as per backed implementation
    
    try {
        const response = await axios.post(`/api/process/watermark?text=${encodeURIComponent(text)}`, formData, {
            responseType: 'blob',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'watermarked.pdf');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    } catch (err) {
        console.error("Watermark error:", err);
        setError("Failed to add watermark.");
    } finally {
        setLoading(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Watermark PDF - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Add watermark to PDF files online for free. Custom text or image watermarks for your documents.",
    "featureList": "PDF Watermarking, Custom Text, Secure"
  };

  return (
    <ToolModal title="Watermark PDF">
      <SEO 
        title="Watermark PDF - Add Text Stamp Online" 
        description="Stamp a text or image watermark over your PDF in seconds online for free. Customize font, position, and transparency."
        keywords="watermark pdf, add watermark, stamp pdf, pdf logo, confidential pdf"
        schema={jsonLd}
      />
      
      <p className="text-gray-500 mb-6 text-center">
        Stamp an image or text over your PDF in seconds.
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
                <label className="block text-gray-700 font-bold mb-2">Watermark Text:</label>
                <input 
                    type="text" 
                    placeholder="e.g. CONFIDENTIAL" 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
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
                    disabled={loading}
                    className={`bg-marvel-red text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-red-700 transition shadow-lg flex items-center justify-center mx-auto gap-2 w-full
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Processing...
                        </>
                    ) : (
                        <>
                             Add Watermark <Stamp className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default WatermarkPDF;
