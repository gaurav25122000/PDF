import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import { File, Loader2, Download, Image } from 'lucide-react';
import axios from 'axios';

const JpgToPdf = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = (fileList) => {
    setFiles(prev => [...prev, ...Array.from(fileList)]);
    setError(null);
  };
  
  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  const processFiles = async () => {
    if (files.length === 0) {
        setError("Please select at least one image file.");
        return;
    }

    setLoading(true);
    setError(null);

    try {
        const keys = [];
        // 1. Upload to S3
        for (const file of files) {
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
             keys.push(key);
        }

        // 2. Trigger Conversion
        const response = await axios.post('/api/process/jpg-to-pdf', { keys });

        // 3. Download Result
        const { downloadUrl } = response.data;
        window.open(downloadUrl, '_blank');
        window.dispatchEvent(new Event('usage-updated'));
    } catch (err) {
        console.error("JPG to PDF error:", err);
        setError("Failed to convert images to PDF.");
    } finally {
        setLoading(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "JPG to PDF - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Convert JPG images to PDF documents online for free. Merge multiple images into a single PDF.",
    "featureList": "Image to PDF conversion, Merge Images, Secure"
  };

  return (
    <ToolModal title="JPG to PDF">
      <SEO 
        title="JPG to PDF Converter - Free Online Tool" 
        description="Convert JPG images to PDF in seconds. Merge multiple images into one PDF document online. Easy, fast, and free."
        keywords="jpg to pdf, image to pdf, convert jpg to pdf, combine images to pdf, free jpg to pdf converter"
        schema={jsonLd}
      />
      
      <p className="text-gray-500 mb-6 text-center">
        Turn your images into a single, polished PDF.
      </p>

      {files.length === 0 ? (
        <div className="w-full">
            <FileUploader 
              onFilesSelected={handleFiles} 
              multiple={true} 
              accept="image/*"
              label1="Select JPG images"
              label2="or drop JPGs here" 
            />
        </div>
      ) : (
        <div className="w-full">
             <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                {files.map((f, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 border rounded-xl group relative">
                         <div className="flex items-center overflow-hidden">
                            <Image className="w-8 h-8 text-blue-500 mr-3 flex-shrink-0" />
                            <span className="font-medium text-gray-700 truncate">{f.name}</span>
                         </div>
                         <button
                            onClick={() => removeFile(index)}
                            className="text-gray-400 hover:text-blue-500 p-1 transition-colors"
                         >
                             ✕
                         </button>
                    </div>
                ))}
             </div>
             
             {error && (
                <div className="mb-4 text-marvel-red font-medium text-center">
                    {error}
                </div>
             )}

            <div className="text-center sticky bottom-0 bg-white pt-2">
                <button 
                    onClick={processFiles}
                    disabled={loading}
                    className={`bg-blue-600 text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-blue-700 transition shadow-lg flex items-center justify-center mx-auto gap-2 w-full
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Converting...
                        </>
                    ) : (
                        <>
                            Convert to PDF <Download className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
             <div className="mt-4 text-center">
                <label className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium text-sm">
                   + Add more images
                   <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                </label>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default JpgToPdf;
