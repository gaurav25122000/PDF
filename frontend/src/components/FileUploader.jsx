import React, { useCallback, useState } from 'react';
import { UploadCloud, File } from 'lucide-react';

const FileUploader = ({ onFilesSelected, multiple = false, accept = ".pdf", label1 = "Select PDF files", label2 = "or drop PDFs here" }) => {
  <div>
    <p className="text-xl font-bold text-gray-700">
      {label1}
    </p>
    <p className="text-gray-500 mt-1">
      {label2}
    </p>
  </div>
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
        ${isDragging
          ? 'border-red-500 bg-red-50 scale-102'
          : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => document.getElementById('fileInput').click()}
    >
      <input
        type="file"
        id="fileInput"
        className="hidden"
        multiple={multiple}
        accept={accept}
        onChange={handleFileInput}
      />

      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`p-4 rounded-full ${isDragging ? 'bg-red-100' : 'bg-red-50'}`}>
          <UploadCloud className={`w-12 h-12 ${isDragging ? 'text-red-600' : 'text-red-500'}`} />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-700">
            {label1}
          </p>
          <p className="text-gray-500 mt-1">
            {label2}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
