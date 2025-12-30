import React, { useEffect, useRef } from 'react';
import * as fabric from 'fabric';

const PDFPage = ({ pdfDoc, pageNumber, onCanvasReady, scale }) => {
    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const containerRef = useRef(null);

    // Initialize Canvas
    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;

        let isMounted = true;
        const init = async () => {
            try {
                const page = await pdfDoc.getPage(pageNumber);
                const viewport = page.getViewport({ scale });

                // Create/Reset Fabric Canvas
                // If it already acts on this ref, dispose?
                if (fabricCanvasRef.current) {
                    fabricCanvasRef.current.dispose();
                }

                const canvas = new fabric.Canvas(canvasRef.current, {
                    width: viewport.width,
                    height: viewport.height,
                    backgroundColor: '#ffffff'
                });
                
                fabricCanvasRef.current = canvas;
                
                // Notify parent
                if (onCanvasReady) onCanvasReady(pageNumber, canvas);

                // Render Page to Image
                const canvasEl = document.createElement('canvas');
                const context = canvasEl.getContext('2d');
                canvasEl.height = viewport.height;
                canvasEl.width = viewport.width;

                await page.render({ canvasContext: context, viewport: viewport }).promise;
                const bgDataUrl = canvasEl.toDataURL();

                if (!isMounted) return;

                // Set Background
                const ImageClass = fabric.FabricImage || fabric.Image;
                ImageClass.fromURL(bgDataUrl).then(img => {
                    if (!isMounted || !fabricCanvasRef.current) return;
                    canvas.setBackgroundImage(img, canvas.requestRenderAll.bind(canvas), {
                        originX: 'left',
                        originY: 'top',
                        left: 0,
                        top: 0
                    });
                });

            } catch (err) {
                console.error(`Error render page ${pageNumber}:`, err);
            }
        };

        init();

        return () => {
            isMounted = false;
            // Clean up?
            // If we dispose here, scrolling quickly might be laggy re-init.
            // But we must dispose to free memory.
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
                // Notify parent removal?
                if (onCanvasReady) onCanvasReady(pageNumber, null);
            }
        };
    }, [pdfDoc, pageNumber, scale]);

    return (
        <div ref={containerRef} className="relative shadow-lg mb-8 bg-white" data-page={pageNumber}>
            <canvas ref={canvasRef} />
            <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded pointer-events-none">
                Page {pageNumber}
            </div>
        </div>
    );
};

export default PDFPage;
