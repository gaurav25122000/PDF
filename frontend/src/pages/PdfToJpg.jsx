import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import { File, Loader2, Download, Image } from 'lucide-react';
import axios from 'axios';

const PdfToJpg = () => {
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
        
        await axios.put(uploadUrl, file, {
             headers: { 'Content-Type': file.type }
        });

        // 2. Trigger Conversion
        const response = await axios.post('/api/process/pdf-to-jpg', { key });

        // 3. Download Result
        // Note: Backend currently returns 400 for this tool, so this part won't be reached until backend is enabled.
        const { downloadUrl } = response.data;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', 'images.zip');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.dispatchEvent(new Event('usage-updated'));
    } catch (err) {
        console.error("PDF to JPG error:", err);
        // Handle backend disabled message
         if (err.response && err.response.data && err.response.data.error) {
            setError(err.response.data.error);
        } else {
            setError("Failed to convert PDF to JPG.");
        }
    } finally {
        setLoading(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "PDF to JPG - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Convert PDF to JPG images online for free. Extract high-quality images from your PDF documents.",
    "featureList": "PDF to Image conversion, High Quality, Secure"
  };

  return (
    <ToolModal title="PDF to JPG">
      <SEO 
        title="PDF to JPG Converter - Free Online Tool" 
        description="Convert each PDF page into a JPG image online for free. High-quality extraction, no installation required. Fast and secure."
        keywords="pdf to jpg, convert pdf to image, pdf to jpeg, free pdf converter, extract images from pdf"
        schema={jsonLd}
      />
      
      <p className="text-gray-500 mb-6 text-center">
        Transform your PDF pages into high-quality images.
      </p>

      {!file ? (
        <div className="w-full">
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".pdf" />
        </div>
      ) : (
        <div className="w-full max-w-lg mx-auto">
             <div className="flex flex-col items-center justify-center p-6 bg-gray-50 border rounded-xl mb-6 relative group">
                <File className="w-16 h-16 text-yellow-500 mb-2" />
                <span className="font-medium text-gray-700">{file.name}</span>
                <button 
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-yellow-500 p-1"
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
                    className={`bg-yellow-500 text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-yellow-600 transition shadow-lg flex items-center justify-center mx-auto gap-2 w-full
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Converting...
                        </>
                    ) : (
                        <>
                            Convert to JPG <Image className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default PdfToJpg;
