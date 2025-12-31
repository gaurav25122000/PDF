import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home'; // Home stays eager for immediate LCP
import AuthModalWrapper from './components/AuthModalWrapper';
import { AuthProvider } from './context/AuthContext';
import { HelmetProvider } from 'react-helmet-async';

// Lazy Load Static Pages
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Security = lazy(() => import('./pages/Security'));
const FAQ = lazy(() => import('./pages/FAQ'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));

// Lazy Load Tools
const MergePDF = lazy(() => import('./pages/MergePDF'));
const SplitPDF = lazy(() => import('./pages/SplitPDF'));
const ProtectPDF = lazy(() => import('./pages/ProtectPDF'));
const UnlockPDF = lazy(() => import('./pages/UnlockPDF'));
const CompressPDF = lazy(() => import('./pages/CompressPDF'));
const JpgToPdf = lazy(() => import('./pages/JpgToPdf'));
const RotatePDF = lazy(() => import('./pages/RotatePDF'));
const WatermarkPDF = lazy(() => import('./pages/WatermarkPDF'));
const PageNumbersPDF = lazy(() => import('./pages/PageNumbersPDF'));
const PdfToJpg = lazy(() => import('./pages/PdfToJpg'));
const PdfToWord = lazy(() => import('./pages/PdfToWord'));
const EditPDF = lazy(() => import('./pages/EditPDF'));
const SignPDF = lazy(() => import('./pages/SignPDF'));
const PdfToExcel = lazy(() => import('./pages/PdfToExcel'));
const PdfToPptx = lazy(() => import('./pages/PdfToPptx'));
const WordToPdf = lazy(() => import('./pages/WordToPdf'));
const ExcelToPdf = lazy(() => import('./pages/ExcelToPdf'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-12 h-12 border-4 border-gray-200 border-t-marvel-red rounded-full animate-spin"></div>
  </div>
);

function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans relative">
            <Navbar />
            <main className="flex-grow relative">
              <ContentWrapper />
            </main>
            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </HelmetProvider>
  )
}

// Wrapper to handle conditional rendering
const ContentWrapper = () => {
    const location = useLocation();
    const isStandardPage = [
        '/login', '/signup', 
        '/privacy', '/terms', '/security', '/faq', '/about', '/contact'
    ].includes(location.pathname);
    const isRoot = location.pathname === '/';

    return (
        <>
            {/* Show Home in background ONLY for Tool Routes (Not Standard, Not Root) */}
            {!isStandardPage && !isRoot && (
                <div className="w-full">
                    <Home />
                </div>
            )}

            {/* Routes */}
            <div className={(isStandardPage || isRoot) ? "w-full min-h-screen bg-gray-50 text-gray-900" : "absolute inset-0 z-10 pointer-events-none"}>
                <Suspense fallback={<div className="min-h-screen bg-white/80 z-50 flex items-center justify-center backdrop-blur-sm pointer-events-auto"><LoadingSpinner /></div>}>
                  <Routes>
                    <Route path="/" element={<Home />} /> {/* Render Home explicitly on Root */}
                    
                    {/* Auth Routes & Standard Pages - Standard Flow */}
                    <Route path="/login" element={<AuthModalWrapper><Login /></AuthModalWrapper>} />
                    <Route path="/signup" element={<AuthModalWrapper><Signup /></AuthModalWrapper>} />
                    
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/security" element={<Security />} />
                    <Route path="/faq" element={<FAQ />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/contact" element={<Contact />} />

                    {/* Tool Routes - Each wraps content in standard ToolModal (Overlay Mode) */}
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
                    <Route path="/edit-pdf" element={<div className="pointer-events-auto absolute inset-0 bg-white z-50"><EditPDF /></div>} />
                    <Route path="/sign-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><SignPDF /></div>} />
                    <Route path="/protect-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><ProtectPDF /></div>} />
                    <Route path="/unlock-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><UnlockPDF /></div>} />
                    <Route path="/rotate-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><RotatePDF /></div>} />
                    <Route path="/watermark-pdf" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><WatermarkPDF /></div>} />
                    <Route path="/page-numbers" element={<div className="pointer-events-auto min-h-screen flex items-center justify-center"><PageNumbersPDF /></div>} />
                    
                    <Route path="*" element={<div className="pointer-events-auto" />} />
                  </Routes>
                </Suspense>
            </div>
        </>
    );
};

export default App;
