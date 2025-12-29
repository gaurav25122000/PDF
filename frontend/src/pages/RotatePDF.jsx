import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import { File, Loader2, RotateCw } from 'lucide-react';
import axios from 'axios';

const RotatePDF = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rotation, setRotation] = useState(90);

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

        // 2. Trigger Rotate
        const response = await axios.post('/api/process/rotate', { key, angle: rotation });

        // 3. Download Result
        const { downloadUrl } = response.data;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', 'rotated.pdf');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.dispatchEvent(new Event('usage-updated'));
    } catch (err) {
        console.error("Rotate error:", err);
        setError("Failed to rotate PDF.");
    } finally {
        setLoading(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Rotate PDF - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Rotate PDF pages online for free. Permanently rotate PDF pages to the correct orientation.",
    "featureList": "PDF Rotation, Page Orientation, Secure"
  };

  return (
    <ToolModal title="Rotate PDF file">
      <SEO 
        title="Rotate PDF - Free Online Tool" 
        description="Rotate your PDF pages online for free. Permanently rotate whole PDF or specific pages 90, 180, or 270 degrees. Save your new orientation."
        keywords="rotate pdf, pdf rotator, rotate pages, turn pdf, pdf page orientation"
        schema={jsonLd}
      />
      
      <p className="text-gray-500 mb-6 text-center">
        Rotate PDF pages. Left, right, or upside down.
      </p>

      {!file ? (
        <div className="w-full">
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".pdf" />
        </div>
      ) : (
        <div className="w-full max-w-lg mx-auto">
             <div className="flex flex-col items-center justify-center p-6 bg-gray-50 border rounded-xl mb-6 relative group">
                <File className="w-16 h-16 text-blue-500 mb-2" />
                <span className="font-medium text-gray-700">{file.name}</span>
                <button 
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-blue-500 p-1"
                >
                    ✕
                </button>
            </div>
             
             <div className="mb-6 text-center">
                <label className="block text-gray-700 font-bold mb-3">Rotation Angle:</label>
                 <div className="flex justify-center gap-3">
                    {[90, 180, 270].map((angle) => (
                        <button
                            key={angle}
                            onClick={() => setRotation(angle)}
                            className={`py-3 px-6 rounded-xl font-medium transition shadow-sm border-2 ${
                                rotation === angle 
                                ? 'bg-blue-100 border-blue-500 text-blue-700' 
                                : 'bg-white border-transparent hover:bg-gray-50 text-gray-600'
                            }`}
                        >
                            {angle}°
                        </button>
                    ))}
                 </div>
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
                    className={`bg-blue-600 text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-blue-700 transition shadow-lg flex items-center justify-center mx-auto gap-2 w-full
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Rotating...
                        </>
                    ) : (
                        <>
                            Rotate PDF <RotateCw className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default RotatePDF;
