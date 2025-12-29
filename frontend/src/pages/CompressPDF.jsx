import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import FileUploader from '../components/FileUploader';
import { File, Loader2, Download, Minimize2 } from 'lucide-react';
import axios from 'axios';

const CompressPDF = () => {
  const [file, setFile] = useState(null);
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

    try {
        const response = await axios.post('/api/process/compress', formData, {
            responseType: 'blob',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'compressed.pdf');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    } catch (err) {
        console.error("Compress error:", err);
        setError("Failed to compress PDF.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <ToolModal title="Compress PDF file">
// ... imports
import SEO from '../components/SEO';

// ... component logic

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Compress PDF - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Reduce file size while optimizing for maximal PDF quality. Compress PDF online for free.",
    "featureList": "Compress PDF, Reduce File Size, Optimize PDF",
  };

  return (
    <ToolModal title="Compress PDF file">
      <SEO 
        title="Compress PDF - Reduce PDF File Size Online" 
        description="Compress PDF files online for free. Reduce PDF file size while maintaining the best possible quality. Optimize your documents for web and email."
        keywords="compress pdf, reduce pdf size, optimize pdf, shrink pdf, pdf compressor online, free pdf compressor"
        schema={jsonLd}
      />
      
      <p className="text-gray-500 mb-6 text-center">
        Shrink your PDF size without losing quality.
      </p>

      {!file ? (
        <div className="w-full">
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".pdf" />
        </div>
      ) : (
        <div className="w-full">
             <div className="flex flex-col items-center justify-center p-6 bg-gray-50 border rounded-xl mb-6 relative group">
                <File className="w-16 h-16 text-green-500 mb-2" />
                <span className="font-medium text-gray-700">{file.name}</span>
                <button 
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-green-500 p-1"
                >
                    ✕
                </button>
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
                    className={`bg-green-600 text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-green-700 transition shadow-lg flex items-center justify-center mx-auto gap-2 w-full
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Compressing...
                        </>
                    ) : (
                        <>
                            Compress PDF <Minimize2 className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default CompressPDF;
