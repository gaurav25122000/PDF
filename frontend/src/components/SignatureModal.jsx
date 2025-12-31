import React, { useState, useRef, useEffect } from 'react';
import { X, PenTool, Type, Upload, Trash2, Check } from 'lucide-react';

const SignatureModal = ({ isOpen, onClose, onSave }) => {
    if (!isOpen) return null;

    const [activeTab, setActiveTab] = useState('draw'); // draw, type, upload
    const [typedName, setTypedName] = useState('');
    const [uploadedImage, setUploadedImage] = useState(null);

    // Draw State
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        if (activeTab === 'draw' && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            // Set canvas size (visual size is controlled by CSS, internal by width/height attr)
            // We want high res
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#000000';
        }
    }, [activeTab, isOpen]);

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (f) => setUploadedImage(f.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        let dataUrl = null;
        if (activeTab === 'draw' && canvasRef.current) {
            dataUrl = canvasRef.current.toDataURL();
        } else if (activeTab === 'type' && typedName) {
            // Render text to canvas to get image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 400;
            canvas.height = 100;
            ctx.font = "48px 'Brush Script MT', cursive";
            ctx.fillStyle = "black";
            ctx.fillText(typedName, 20, 70);
            dataUrl = canvas.toDataURL();
        } else if (activeTab === 'upload' && uploadedImage) {
            dataUrl = uploadedImage;
        }

        if (dataUrl) {
            onSave(dataUrl);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="font-bold text-lg text-white">Add Signature</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex border-b border-white/10 bg-black/20">
                    <button
                        onClick={() => setActiveTab('draw')}
                        className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${activeTab === 'draw' ? 'bg-white/5 text-red-500 border-b-2 border-red-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <PenTool className="w-4 h-4" /> Draw
                    </button>
                    <button
                        onClick={() => setActiveTab('type')}
                        className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${activeTab === 'type' ? 'bg-white/5 text-red-500 border-b-2 border-red-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Type className="w-4 h-4" /> Type
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${activeTab === 'upload' ? 'bg-white/5 text-red-500 border-b-2 border-red-500' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Upload className="w-4 h-4" /> Upload
                    </button>
                </div>

                <div className="p-6 min-h-[250px] flex flex-col items-center justify-center bg-[#0a0a0a]">
                    {activeTab === 'draw' && (
                        <div className="w-full h-40 bg-white border-2 border-dashed border-gray-600 rounded-lg relative overflow-hidden">
                             {/* Canvas stays white for standard ink signature behavior, or we could make it dark with white ink? 
                                Typically signatures are black on white. Keep white for now for better contrast export. */}
                            <canvas
                                ref={canvasRef}
                                className="w-full h-full cursor-crosshair touch-none"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                            />
                            <button onClick={clearCanvas} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-500 bg-gray-100/50 shadow rounded-full backdrop-blur-sm" title="Clear">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {activeTab === 'type' && (
                        <div className="w-full">
                            <input
                                type="text"
                                placeholder="Type your name"
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                className="w-full p-3 text-2xl font-[cursive] border-b-2 border-gray-700 focus:border-red-500 outline-none bg-transparent text-center text-white placeholder-gray-600"
                                style={{ fontFamily: "'Brush Script MT', cursive" }}
                            />
                            <p className="text-center text-xs text-gray-500 mt-4">Preview above</p>
                        </div>
                    )}

                    {activeTab === 'upload' && (
                        <div className="w-full text-center">
                             {uploadedImage ? (
                                 <div className="relative inline-block group">
                                     <img src={uploadedImage} className="max-h-40 object-contain border border-white/10 rounded bg-white/5" />
                                     <button onClick={() => setUploadedImage(null)} className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow hover:bg-red-700">
                                         <X className="w-3 h-3" />
                                     </button>
                                 </div>
                             ) : (
                                 <label className="cursor-pointer flex flex-col items-center gap-2 p-8 border-2 border-dashed border-white/10 rounded-xl hover:bg-white/5 hover:border-red-500/50 transition-all group">
                                     <Upload className="w-8 h-8 text-gray-500 group-hover:text-red-500 transition-colors" />
                                     <span className="text-sm text-gray-400 group-hover:text-gray-200">Click to upload image</span>
                                     <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                                 </label>
                             )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-[#111]">
                    <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:bg-white/10 hover:text-white rounded-lg text-sm font-medium transition-colors">Cancel</button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        disabled={activeTab === 'type' && !typedName || activeTab === 'upload' && !uploadedImage}
                    >
                        <Check className="w-4 h-4" /> Add Signature
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignatureModal;
