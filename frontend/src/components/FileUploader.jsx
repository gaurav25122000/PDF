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
      className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer group
        ${isDragging 
          ? 'border-red-500 bg-red-500/10 scale-[1.02]' 
          : 'border-white/10 hover:border-red-500/50 hover:bg-white/5'
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
        <div className={`p-5 rounded-full transition-colors ${isDragging ? 'bg-red-500/20' : 'bg-white/5 group-hover:bg-red-500/10'}`}>
           <UploadCloud className={`w-12 h-12 ${isDragging ? 'text-red-500' : 'text-gray-400 group-hover:text-red-500'} transition-colors`} />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-200 group-hover:text-white transition-colors">
            {label1}
          </p>
          <p className="text-gray-500 mt-2">
            {label2}
          </p>
        </div>
        <button className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors border border-white/5">
            Browse Files
        </button>
      </div>
    </div>
  );
};

export default FileUploader;
