import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import { File, Loader2, Download, FileText } from 'lucide-react';
import axios from 'axios';

const WordToPdf = () => {
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

        // 2. Trigger Conversion
        const response = await axios.post('/api/process/word-to-pdf', { key });

        // 3. Download Result
        const { downloadUrl } = response.data;
        window.open(downloadUrl, '_blank');
        window.dispatchEvent(new Event('usage-updated'));
    } catch (err) {
        console.error("Word to PDF error:", err);
        setError("Failed to convert Word to PDF.");
    } finally {
        setLoading(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Word to PDF - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Convert Word documents to PDF online for free. Make DOC and DOCX files easy to read by converting them to PDF.",
    "featureList": "Word to PDF conversion, DOCX support, Secure"
  };

  return (
    <ToolModal title="Word to PDF">
      <SEO 
        title="Word to PDF Converter - Free Online Tool" 
        description="Make DOC and DOCX files easy to read by converting them to PDF online for free. Convert Word documents to PDF instantly."
        keywords="word to pdf, convert doc to pdf, docx to pdf, free word to pdf converter, document converter"
        schema={jsonLd}
      />
      
      <p className="text-gray-500 mb-6 text-center">
        Solidify your Word documents into immutable PDFs.
      </p>

      {!file ? (
        <div className="w-full">
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".doc,.docx" />
        </div>
      ) : (
        <div className="w-full max-w-lg mx-auto">
             <div className="flex flex-col items-center justify-center p-6 bg-gray-50 border rounded-xl mb-6 relative group">
                <File className="w-16 h-16 text-blue-800 mb-2" />
                <span className="font-medium text-gray-700">{file.name}</span>
                <button 
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-blue-800 p-1"
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
                    className={`bg-blue-800 text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-blue-900 transition shadow-lg flex items-center justify-center mx-auto gap-2 w-full
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Converting...
                        </>
                    ) : (
                        <>
                            Convert to PDF <FileText className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default WordToPdf;
