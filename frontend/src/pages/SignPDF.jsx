import React, { useState, useRef, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import ToolModal from '../components/ToolModal';
import SEO from '../components/SEO';
import FileUploader from '../components/FileUploader';
import SignatureModal from '../components/SignatureModal';
import PDFPage from '../components/PDFPage';
import { File, Loader2, PenTool, ShieldCheck, Plus } from 'lucide-react';
import axios from 'axios';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import * as fabric from 'fabric';


pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const SignPDF = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    const [pdfDoc, setPdfDoc] = useState(null);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(1);
    const [activePage, setActivePage] = useState(1);
    const [showSignModal, setShowSignModal] = useState(false);

    const canvasMap = useRef(new Map());
    const observerRef = useRef(null);
    const pagesContainerRef = useRef(null);

    const handleFiles = (fileList) => {
        if (fileList.length > 0) {
            setFile(fileList[0]);
            setError(null);
            loadPDF(fileList[0]);
        }
    };

    const loadPDF = async (pdfFile) => {
        setLoading(true);
        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const loadedPdf = await pdfjsLib.getDocument(arrayBuffer).promise;
            setPdfDoc(loadedPdf);
            setNumPages(loadedPdf.numPages);

            // Reset
            canvasMap.current.clear();
            setActivePage(1);

        } catch (err) {
            console.error("Error loading PDF:", err);
            setError("Failed to load PDF.");
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if (!numPages || !pagesContainerRef.current) return;

        const options = {
            root: pagesContainerRef.current,
            rootMargin: '0px',
            threshold: 0.5
        };

        const callback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const page = parseInt(entry.target.getAttribute('data-page'));
                    if (page) setActivePage(page);
                }
            });
        };

        const observer = new IntersectionObserver(callback, options);
        observerRef.current = observer;


        const pages = pagesContainerRef.current.querySelectorAll('[data-page]');
        pages.forEach(p => observer.observe(p));

        return () => observer.disconnect();
    }, [numPages]);

    // Dynamic Scale
    useEffect(() => {
        const calcScale = async () => {
            if (!pdfDoc || !pagesContainerRef.current) return;
            try {
                // Get first page to determine width fit
                const page = await pdfDoc.getPage(1);
                const viewport = page.getViewport({ scale: 1 });
                const containerWidth = pagesContainerRef.current.clientWidth - 48; // -48 for padding
                if (containerWidth > 0) {
                    const newScale = containerWidth / viewport.width;
                    setScale(newScale);
                }
            } catch (e) {
                console.error("Scale error:", e);
            }
        };

        calcScale();
        window.addEventListener('resize', calcScale);
        return () => window.removeEventListener('resize', calcScale);
    }, [pdfDoc]);

    const handleCanvasReady = (pageNumber, canvas) => {
        if (canvas) {
            canvasMap.current.set(pageNumber, canvas);

            if (observerRef.current) {
                const el = pagesContainerRef.current?.querySelector(`[data-page="${pageNumber}"]`);
                if (el) observerRef.current.observe(el);
            }
        } else {
            canvasMap.current.delete(pageNumber);
        }
    };

    const addSignature = (dataUrl) => {

        const canvas = canvasMap.current.get(activePage);
        if (!canvas) {
            alert("Active page not ready.");
            return;
        }

        const ImageClass = fabric.FabricImage || fabric.Image;
        ImageClass.fromURL(dataUrl).then(img => {
            img.scaleToWidth(150);
            canvas.add(img);
            canvas.centerObject(img);
            canvas.setActiveObject(img);
            canvas.requestRenderAll();
        });
    };

    const savePdf = async () => {
        if (!file || canvasMap.current.size === 0) return;
        setProcessing(true);

        try {
            const operations = [];

            // Collect operations from all pages
            for (const [pageIndex, canvas] of canvasMap.current.entries()) {
                const objects = canvas.getObjects();

                for (const obj of objects) {
                    if (obj.type === 'image' || obj.type === 'fabric-image') {
                        const dataUrl = obj.toDataURL({ format: 'png', multiplier: 2 });

                        const originalBg = canvas.backgroundImage;
                        canvas.backgroundImage = null; // Hide PDF
                        const overlay = canvas.toDataURL({ format: 'png', multiplier: 2 });
                        canvas.backgroundImage = originalBg; // Restore

                        if (canvas.getObjects().length > 0) {
                            operations.push({
                                page: pageIndex - 1, // 0-based
                                type: 'image',
                                data: overlay,
                                x: 0,
                                y: 0
                            });
                        }
                    }
                }
            }

            for (let i = 0; i < operations.length; i++) {
                const op = operations[i];
                const page = await pdfDoc.getPage(op.page + 1);
                const vp = page.getViewport({ scale: 1 });
                op.width = vp.width;
                op.height = vp.height;
            }

            if (operations.length === 0) {
                alert("No signatures/changes found to save.");
                setProcessing(false);
                return;
            }

            const opsJson = JSON.stringify(operations);

            // 1. Upload
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

            // 2. Trigger Process
            const response = await axios.post('/api/process/edit', { key, operations: opsJson });

            // 3. Download
            const { downloadUrl } = response.data;
            window.open(downloadUrl, '_blank');
            window.dispatchEvent(new Event('usage-updated'));

        } catch (err) {
            console.error("Sign PDF Error:", err);
            setError("Failed to sign PDF.");
        } finally {
            setProcessing(false);
        }
    };

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Sign PDF - MarvelPDF",
        "applicationCategory": "ProductivityApplication",
        "operatingSystem": "Any",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": "Sign PDF documents online for free. Draw your signature or upload an image to sign PDFs.",
        "featureList": "PDF Signing, Electronic Signature, Secure"
    };

    return (
        <ToolModal title="Sign PDF">
            <SEO
                title="Sign PDF - Free Online PDF Signer"
                description="Sign yourself or electronic signatures to PDF files online for free. Draw your signature or upload a signature image. Secure and legally binding."
                keywords="sign pdf, e-sign pdf, electronic signature, free pdf signer, sign document online"
                schema={jsonLd}
            />

            <p className="text-gray-500 mb-6 text-center">
                Sign yourself or request electronic signatures.
            </p>

            {!file ? (
                <div className="w-full">
                    <FileUploader onFilesSelected={handleFiles} multiple={false} accept=".pdf" />
                </div>
            ) : (
                <div className="w-full h-full flex flex-col">
                    <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden">
                        <div ref={pagesContainerRef} className="flex-1 bg-gray-100 rounded-xl overflow-auto p-4 flex flex-col items-center border border-gray-200">
                            {Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
                                <PDFPage
                                    key={page}
                                    pageNumber={page}
                                    pdfDoc={pdfDoc}
                                    onCanvasReady={handleCanvasReady}
                                    scale={scale}
                                />
                            ))}

                            {loading && (
                                <div className="fixed inset-0 flex items-center justify-center bg-white/50 z-50">
                                    <Loader2 className="animate-spin w-12 h-12 text-marvel-red" />
                                </div>
                            )}
                        </div>

                        <div className="w-full md:w-80 flex flex-col gap-6 overflow-y-auto">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">
                                    <div className="flex items-center">
                                        <PenTool className="w-5 h-5 mr-2 text-marvel-red" /> Signature Tools
                                    </div>
                                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">Page {activePage}</span>
                                </h3>

                                <button
                                    onClick={() => setShowSignModal(true)}
                                    className="w-full bg-marvel-red text-white font-bold py-4 rounded-xl hover:bg-red-700 transition shadow-md flex items-center justify-center gap-2 mb-4"
                                >
                                    <Plus className="w-5 h-5" /> Add Signature
                                </button>

                                <p className="text-xs text-gray-400 mt-2 text-center leading-relaxed">
                                    Signature will be added to <b>Page {activePage}</b>.
                                    <br />
                                    Drag to position/resize.
                                </p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-marvel-red text-sm font-medium rounded-lg text-center">
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>

                    <SignatureModal
                        isOpen={showSignModal}
                        onClose={() => setShowSignModal(false)}
                        onSave={addSignature}
                    />


                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-center sticky bottom-0 bg-white">
                        <button
                            onClick={savePdf}
                            disabled={processing || loading}
                            className={`bg-marvel-red text-white text-xl font-bold py-4 px-12 rounded-xl hover:bg-red-700 transition shadow-lg flex items-center justify-center gap-2
                        ${(processing || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="animate-spin" /> Signing...
                                </>
                            ) : (
                                <>
                                    Sign & Download PDF <ShieldCheck className="w-5 h-5 ml-2" />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="absolute top-4 right-4 z-10">
                        <button
                            onClick={() => setFile(null)}
                            className="bg-white/90 p-2 rounded-full shadow-sm hover:text-marvel-red transition"
                            title="Close file"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </ToolModal>
    );
};

export default SignPDF;
