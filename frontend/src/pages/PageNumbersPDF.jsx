import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import { File, Loader2, Hash } from 'lucide-react';
import axios from 'axios';

const PageNumbersPDF = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState('bottom');

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

    try {
        // 1. Upload to S3
        const uploadConfigRes = await axios.post('/api/s3/upload-url', {
             filename: file.name,
             contentType: file.type
        });
        const { uploadUrl, key } = uploadConfigRes.data;
        
        await fetch(uploadUrl, {
             method: 'PUT',
             body: file,
             headers: { 'Content-Type': file.type }
        });

        // 2. Trigger Page Numbers
        const response = await axios.post('/api/process/page-numbers', { key, position });

        // 3. Download Result
        const { downloadUrl } = response.data;
        window.open(downloadUrl, '_blank');
        window.dispatchEvent(new Event('usage-updated'));
    } catch (err) {
        console.error("Page Numbers error:", err);
        setError("Failed to add page numbers.");
    } finally {
        setLoading(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Page Numbers - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Add page numbers to PDF files online for free. Number your PDF pages easily.",
    "featureList": "Add Page Numbers, Pagination, Secure"
  };

  return (
    <ToolModal title="Page Numbers">
      <SEO 
        title="Add Page Numbers to PDF - Free Online Tool" 
        description="Add page numbers to your PDFs efficiently online for free. Select position and format for PDF pagination."
        keywords="page numbers pdf, add page numbers, number pdf pages, paginate pdf, pdf numbering"
        schema={jsonLd}
      />
      
      <p className="text-gray-400 mb-6 text-center">
        Add page numbers into your PDFs with ease.
      </p>

      {!file ? (
        <div className="w-full">
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".pdf" />
        </div>
      ) : (
        <div className="w-full max-w-lg mx-auto">
             <div className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-xl mb-6 relative group hover:bg-white/10 transition-colors">
                <File className="w-16 h-16 text-red-500 mb-2" />
                <span className="font-medium text-gray-200">{file.name}</span>
                <button 
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-500 p-1 transition-colors"
                >
                    ✕
                </button>
            </div>
             
             <div className="mb-6">
                <label className="block text-gray-300 font-bold mb-2 text-sm uppercase tracking-wide">Position:</label>
                <select 
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
                >
                    <option value="bottom" className="bg-[#1a1a1a]">Bottom Center</option>
                    <option value="top" className="bg-[#1a1a1a]">Top Center</option>
                    <option value="bottom-left" className="bg-[#1a1a1a]">Bottom Left</option>
                    <option value="bottom-right" className="bg-[#1a1a1a]">Bottom Right</option>
                </select>
             </div>
             
            {error && (
                <div className="mb-4 text-marvel-red font-medium text-center">
                    {error}
                </div>
            )}

            <div className="text-center sticky bottom-0 bg-[#0a0a0a]/95 backdrop-blur-xl pt-4 border-t border-white/5 pb-2 -mx-6 px-6">
                <button 
                    onClick={processFile}
                    disabled={loading}
                    className={`bg-red-600 text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-600/20 flex items-center justify-center mx-auto gap-2 w-full
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Processing...
                        </>
                    ) : (
                        <>
                             Add Page Numbers <Hash className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default PageNumbersPDF;
