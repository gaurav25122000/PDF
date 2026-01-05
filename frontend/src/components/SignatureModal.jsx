import React, { useState, useRef, useEffect } from 'react';
import { X, PenTool, Type, Upload, Trash2, Check } from 'lucide-react';

const SignatureModal = ({ isOpen, onClose, onSave }) => {
    // Moved early return to after hooks to satisfy React Rules of Hooks

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-bold text-lg">Add Signature</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab('draw')}
                        className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm font-medium ${activeTab === 'draw' ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <PenTool className="w-4 h-4" /> Draw
                    </button>
                    <button
                        onClick={() => setActiveTab('type')}
                        className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm font-medium ${activeTab === 'type' ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Type className="w-4 h-4" /> Type
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`flex-1 p-3 flex items-center justify-center gap-2 text-sm font-medium ${activeTab === 'upload' ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                        <Upload className="w-4 h-4" /> Upload
                    </button>
                </div>

                <div className="p-6 min-h-[250px] flex flex-col items-center justify-center bg-gray-50">
                    {activeTab === 'draw' && (
                        <div className="w-full h-40 bg-white border-2 border-dashed border-gray-300 rounded-lg relative">
                            <canvas
                                ref={canvasRef}
                                className="w-full h-full cursor-crosshair touch-none"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                            />
                            <button onClick={clearCanvas} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 bg-white shadow rounded-full" title="Clear">
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
                                className="w-full p-3 text-2xl font-[cursive] border-b-2 border-gray-300 focus:border-purple-600 outline-none bg-transparent text-center"
                                style={{ fontFamily: "'Brush Script MT', cursive" }}
                            />
                            <p className="text-center text-xs text-gray-400 mt-2">Preview above</p>
                        </div>
                    )}

                    {activeTab === 'upload' && (
                        <div className="w-full text-center">
                            {uploadedImage ? (
                                <div className="relative inline-block">
                                    <img src={uploadedImage} className="max-h-40 object-contain border rounded bg-white" />
                                    <button onClick={() => setUploadedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow">
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer flex flex-col items-center gap-2 p-8 border-2 border-dashed border-gray-300 rounded-lg hover:bg-white hover:border-purple-400 transition">
                                    <Upload className="w-8 h-8 text-gray-400" />
                                    <span className="text-sm text-gray-500">Click to upload image</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                                </label>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
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
