import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async'; // Can remove if unused, but SEO component handles it
import SEO from '../components/SEO';
import ToolModal from '../components/ToolModal';
import FileUploader from '../components/FileUploader';
import { File, Loader2, Download, Scissors } from 'lucide-react';
import axios from 'axios';

const SplitPDF = () => {
  const [file, setFile] = useState(null);
  const [range, setRange] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFiles = (fileList) => {
    if (fileList.length > 0) {
        setFile(fileList[0]);
        setError(null);
    }
  };

  const processFile = async () => {
    if (!file) {
        setError("Please select a PDF file.");
        return;
    }
    if (!range.trim()) {
        setError("Please enter page ranges (e.g., 1-5, 8).");
        return;
    }

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

        // 2. Trigger Split
        const response = await axios.post('/api/process/split', { key, range });

        // 3. Download Result
        const { downloadUrl } = response.data;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', 'split.pdf');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.dispatchEvent(new Event('usage-updated'));
    } catch (err) {
        console.error("Split error:", err);
        setError("Failed to split PDF. Check page range.");
    } finally {
        setLoading(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Split PDF - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Separate one page or a whole set for easy conversion into independent PDF files. Free and secure.",
    "featureList": "Split PDF, Extract Pages, Secure processing",
  };

  return (
    <ToolModal title="Split PDF file">
      <SEO 
        title="Split PDF - Extract Pages from PDF Online" 
        description="Split specific PDF pages or extract every page into separate documents. Split PDF file online for free."
        keywords="split pdf, extract pages, separate pdf, cut pdf, pdf splitter online, free pdf splitter"
        schema={jsonLd}
      />
      
      <p className="text-gray-500 mb-6 text-center">
        Extract pages from your PDF with surgical precision.
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
                <label className="block text-gray-700 font-bold mb-2">Page Range (e.g. 1-5, 8, 11-13):</label>
                <input 
                    type="text" 
                    placeholder="1-5, 8, 11-13" 
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
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
                    disabled={loading || !range}
                    className={`bg-marvel-red text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-red-700 transition shadow-lg flex items-center justify-center mx-auto gap-2 w-full
                        ${loading || !range ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Splitting...
                        </>
                    ) : (
                        <>
                            Split PDF <Scissors className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default SplitPDF;
