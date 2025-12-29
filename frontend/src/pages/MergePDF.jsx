import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import FileUploader from '../components/FileUploader';
import { File, Loader2, Download } from 'lucide-react';
import axios from 'axios';

const MergePDF = () => {
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

  const mergeFiles = async () => {
    if (files.length < 2) {
        setError("Please select at least 2 PDF files.");
        return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    files.forEach((file) => {
        formData.append("files", file);
    });

    try {
        const response = await axios.post('/api/process/merge', formData, {
            responseType: 'blob',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'merged.pdf');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    } catch (err) {
        console.error("Merge error:", err);
        setError("Failed to merge PDFs. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <ToolModal title="Merge PDF files">
// ... imports
import SEO from '../components/SEO';

// ... component logic

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Merge PDF - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Combine PDFs in the order you want with the easiest PDF merger available. Mobile friendly and free.",
    "featureList": "Combine PDFs, Order rearrangement, Secure processing",
  };

  return (
    <ToolModal title="Merge PDF files">
      <SEO 
        title="Merge PDF - Combine PDF Files Online for Free" 
        description="Select multiple PDF files and merge them in seconds. Merge & combine PDF files online, easily and free. No registration required."
        keywords="merge pdf, combine pdf, join pdf, pdf merger, combine pdf online, free pdf merger"
        schema={jsonLd}
      />
      
      {/* Description for SEO (visually can be subtle or hidden if modal is tight, but let's keep it clean) */}
      <p className="text-gray-500 mb-6 text-center">
        Assemble multiple PDFs into one unified document.
      </p>

      {files.length === 0 ? (
        <div className="w-full">
            <FileUploader onFilesSelected={handleFiles} multiple={true} accept=".pdf" />
        </div>
      ) : (
        <div className="w-full">
             <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                {files.map((f, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 border rounded-xl group relative">
                         <div className="flex items-center overflow-hidden">
                            <File className="w-8 h-8 text-marvel-red mr-3 flex-shrink-0" />
                            <span className="font-medium text-gray-700 truncate">{f.name}</span>
                         </div>
                         <button
                            onClick={() => removeFile(index)}
                            className="text-gray-400 hover:text-marvel-red p-1 transition-colors"
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

            <div className="text-center sticky bottom-0 bg-white pt-4">
                <button 
                    onClick={mergeFiles}
                    disabled={loading || files.length < 2}
                    className={`bg-marvel-red text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-red-700 transition shadow-lg flex items-center justify-center mx-auto gap-2 w-full
                        ${loading || files.length < 2 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Assembling...
                        </>
                    ) : (
                        <>
                            Merge PDFs <Download className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
            {/* Add more to add another file? */}
             <div className="mt-4 text-center">
                <label className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium text-sm">
                   + Add more files
                   <input type="file" multiple accept=".pdf" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                </label>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default MergePDF;
