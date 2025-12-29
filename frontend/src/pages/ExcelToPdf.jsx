import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import { File, Loader2, Download, Sheet } from 'lucide-react';
import axios from 'axios';

const ExcelToPdf = () => {
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
        const response = await axios.post('/api/process/excel-to-pdf', formData, {
            responseType: 'blob',
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'converted.pdf');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.dispatchEvent(new Event('usage-updated'));
    } catch (err) {
        console.error("Excel to PDF error:", err);
        setError("Failed to convert Excel to PDF.");
    } finally {
        setLoading(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Excel to PDF - MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Convert Excel spreadsheets to PDF online for free. Make EXCEL spreadsheets easy to read by converting them to PDF.",
    "featureList": "Excel to PDF conversion, XLSX support, Secure"
  };

  return (
    <ToolModal title="Excel to PDF">
      <SEO 
        title="Excel to PDF Converter - Free Online Tool" 
        description="Make EXCEL spreadsheets easy to read by converting them to PDF online for free. Convert XLS and XLSX files to PDF instantly."
        keywords="excel to pdf, convert xls to pdf, xlsx to pdf, free excel to pdf converter, spreadsheet converter"
        schema={jsonLd}
      />
      
      <p className="text-gray-500 mb-6 text-center">
        Freeze your dynamic spreadsheets into static PDFs.
      </p>

      {!file ? (
        <div className="w-full">
            <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".xlsx,.xls" />
        </div>
      ) : (
        <div className="w-full max-w-lg mx-auto">
             <div className="flex flex-col items-center justify-center p-6 bg-gray-50 border rounded-xl mb-6 relative group">
                <File className="w-16 h-16 text-green-700 mb-2" />
                <span className="font-medium text-gray-700">{file.name}</span>
                <button 
                    onClick={() => setFile(null)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-green-700 p-1"
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
                    className={`bg-green-700 text-white text-xl font-bold py-4 px-10 rounded-xl hover:bg-green-800 transition shadow-lg flex items-center justify-center mx-auto gap-2 w-full
                        ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" /> Converting...
                        </>
                    ) : (
                        <>
                            Convert to PDF <Sheet className="w-5 h-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
      )}
    </ToolModal>
  );
};

export default ExcelToPdf;
