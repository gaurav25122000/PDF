import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';

import MergePDF from './pages/MergePDF';
import SplitPDF from './pages/SplitPDF';
import ProtectPDF from './pages/ProtectPDF';
import UnlockPDF from './pages/UnlockPDF';
import CompressPDF from './pages/CompressPDF';
import JpgToPdf from './pages/JpgToPdf';
import RotatePDF from './pages/RotatePDF';
import WatermarkPDF from './pages/WatermarkPDF';
import PageNumbersPDF from './pages/PageNumbersPDF';
import PdfToJpg from './pages/PdfToJpg';
import PdfToWord from './pages/PdfToWord';
import EditPDF from './pages/EditPDF';
import SignPDF from './pages/SignPDF';
import PdfToExcel from './pages/PdfToExcel';
import PdfToPptx from './pages/PdfToPptx';
import WordToPdf from './pages/WordToPdf';
import ExcelToPdf from './pages/ExcelToPdf';

import { HelmetProvider } from 'react-helmet-async';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans relative">
          <Navbar />
          <main className="flex-grow relative">
             {/* 
                We always render Home in the background. 
                The Routes will render the ToolModal ON TOP of Home.
             */}
             <div className="absolute inset-0">
                <Home />
             </div>

             {/* These routes render the Modal overlays */}
            <div className="relative z-10 pointer-events-none">
                {/* 
                    We need a wrapper that allows clicking through to home when no route matches?
                    Actually, if Home is absolute, we need the Routes container to be full screen but pointer-events-none,
                    and the Modals inside to be pointer-events-auto.
                */}
                <Routes>
                  <Route path="/" element={<div />} /> {/* Empty for root, so Home shows underneath */}
                  
                  {/* Tool Routes - Each wraps content in standard ToolModal */}
                  <Route path="/merge-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><MergePDF /></div>} />
                  <Route path="/split-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><SplitPDF /></div>} />
                  <Route path="/compress-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><CompressPDF /></div>} />
                  <Route path="/pdf-to-jpg" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><PdfToJpg /></div>} /> 
                  <Route path="/jpg-to-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><JpgToPdf /></div>} />
                  <Route path="/pdf-to-word" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><PdfToWord /></div>} />
                  <Route path="/pdf-to-excel" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><PdfToExcel /></div>} />
                  <Route path="/pdf-to-powerpoint" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><PdfToPptx /></div>} />
                  <Route path="/word-to-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><WordToPdf /></div>} />
                  <Route path="/excel-to-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><ExcelToPdf /></div>} />
                  <Route path="/edit-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><EditPDF /></div>} />
                  <Route path="/sign-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><SignPDF /></div>} />
                  <Route path="/protect-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><ProtectPDF /></div>} />
                  <Route path="/unlock-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><UnlockPDF /></div>} />
                  <Route path="/rotate-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><RotatePDF /></div>} />
                  <Route path="/watermark-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><WatermarkPDF /></div>} />
                  <Route path="/page-numbers" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><PageNumbersPDF /></div>} />
                  
                  <Route path="*" element={<div className="pointer-events-auto" />} />
                </Routes>
            </div>
          </main>
          <Footer />
        </div>
      </Router>
    </HelmetProvider>
  )
}

export default App
