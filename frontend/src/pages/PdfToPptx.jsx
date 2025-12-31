import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import { File, Loader2, Download, Presentation } from 'lucide-react';
import axios from 'axios';

const PdfToPptx = () => {
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
        const response = await axios.post('/api/process/pdf-to-pptx', { key });

        // 3. Download Result
        const { downloadUrl } = response.data;
        window.open(downloadUrl, '_blank');
        window.dispatchEvent(new Event('usage-updated'));
    } catch (err) {
        console.error("PDF to PPTX error:", err);
        setError("Failed to convert PDF to PowerPoint.");
    } finally {
        setLoading(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "PDF to PowerPoint - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Convert PDF files to editable PowerPoint presentations online for free. Create slides from your documents.",
    "featureList": "PDF to PPTX conversion, Slide Creation, Secure"
  };

  return (
    <ToolModal title="PDF to PowerPoint">
      <SEO 
        title="PDF to PowerPoint Converter - Free Online Tool" 
        description="Turn your PDF files into easy to edit PPT and PPTX slideshows online for free. Create presentations from PDF documents instantly."
        keywords="pdf to ppt, convert pdf to powerpoint, pdf to pptx, free pdf to ppt converter, pdf slides"
        schema={jsonLd}
      />
      
      <p className="text-gray-400 mb-6 text-center">
        Transform PDFs into dynamic PowerPoint slides.
      </p>

      {!file ? (
        <div className="w-full">
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".pdf" />
        </div>
      ) : (
        <div className="w-full max-w-lg mx-auto">
             <div className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-xl mb-6 relative group hover:bg-white/10 transition-colors">
                <File className="w-16 h-16 text-orange-500 mb-2" />
                <span className="font-medium text-gray-200">{file.name}</span>
                <button 
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 text-gray-500 hover:text-orange-500 p-1 transition-colors"
                >
                    ✕
                </button>
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
                    className={`bg-orange-600 text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-orange-700 transition shadow-lg shadow-orange-600/20 flex items-center justify-center mx-auto gap-2 w-full
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Converting...
                        </>
                    ) : (
                        <>
                            Convert to PPT <Presentation className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default PdfToPptx;
