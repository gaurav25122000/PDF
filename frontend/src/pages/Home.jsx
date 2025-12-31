import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SEO from '../components/SEO';
import ToolCard from '../components/ToolCard';
import UsageBanner from '../components/UsageBanner';
import {
  Combine,
  Scissors,
  Minimize2,
  FileText,
  Image,
  ShieldCheck,
  Unlock,
  Edit3,
  PenTool,
  Sheet,
  Presentation,
  Search
} from 'lucide-react';

// Define tools outside component to ensure immutability and simple access
const TOOLS = [
    {
      title: "Edit PDF",
      description: "Add text, shapes, comments and highlights to a PDF file.",
      icon: Edit3, 
      to: "/edit-pdf",
      color: "purple"
    },
    {
      title: "Merge PDF",
      description: "Combine PDFs in the order you want with the easiest PDF merger available.",
      icon: Combine,
      to: "/merge-pdf",
      color: "red"
    },
    {
      title: "Split PDF",
      description: "Separate one page or a whole set for easy conversion into independent PDF files.",
      icon: Scissors,
      to: "/split-pdf",
      color: "red"
    },
    {
      title: "Compress PDF",
      description: "Reduce file size while optimizing for maximal PDF quality.",
      icon: Minimize2,
      to: "/compress-pdf",
      color: "green"
    },
    {
      title: "PDF to Word",
      description: "Easily convert your PDF files into easy to edit DOC and DOCX documents.",
      icon: FileText,
      to: "/pdf-to-word",
      color: "blue"
    },
    {
      title: "PDF to JPG",
      description: "Convert each PDF page into a JPG image.",
      icon: Image,
      to: "/pdf-to-jpg",
      color: "yellow"
    },
    {
      title: "JPG to PDF",
      description: "Convert JPG images to PDF in seconds. Easily adjust orientation and margins.",
      icon: Image,
      to: "/jpg-to-pdf",
      color: "blue"
    },
    {
      title: "Protect PDF",
      description: "Encrypt your PDF file with a password to prevent unauthorized access.",
      icon: ShieldCheck,
      to: "/protect-pdf",
      color: "red"
    },
    {
      title: "Unlock PDF",
      description: "Remove PDF password security, giving you the freedom to use your PDF files.",
      icon: Unlock,
      to: "/unlock-pdf",
      color: "red"
    },
    {
      title: "Rotate PDF",
      description: "Rotate your PDF pages as you need.",
      icon: Minimize2, 
      to: "/rotate-pdf",
      color: "blue"
    },
    {
      title: "Watermark",
      description: "Stamp an image or text over your PDF in seconds.",
      icon: Image, 
      to: "/watermark-pdf",
      color: "red"
    },
    {
      title: "Page Numbers",
      description: "Add page numbers into your PDFs with ease.",
      icon: FileText, 
      to: "/page-numbers",
      color: "red"
    },
    {
      title: "Sign PDF",
      description: "Sign yourself or request electronic signatures.",
      icon: PenTool, 
      to: "/sign-pdf",
      color: "green"
    },
    {
      title: "PDF to Excel",
      description: "Convert Data to editable Excel spreadsheets.",
      icon: Sheet, 
      to: "/pdf-to-excel",
      color: "green"
    },
    {
      title: "PDF to PowerPoint",
      description: "Turn your PDF files into easy to edit PPT and PPTX slideshows.",
      icon: Presentation, 
      to: "/pdf-to-powerpoint",
      color: "red"
    },
    {
      title: "Word to PDF",
      description: "Make DOC and DOCX files easy to read by converting them to PDF.",
      icon: FileText, 
      to: "/word-to-pdf",
      color: "blue"
    },
    {
      title: "Excel to PDF",
      description: "Make EXCEL spreadsheets easy to read by converting them to PDF.",
      icon: Sheet, 
      to: "/excel-to-pdf",
      color: "green"
    }
];

const Home = () => {
  const [query, setQuery] = useState('');
  const [filteredTools, setFilteredTools] = useState([...TOOLS]); 
  const [fuseInstance, setFuseInstance] = useState(null);

  // Load Fuse.js in background
  useEffect(() => {
     const loadFuse = async () => {
         try {
            const { default: Fuse } = await import('fuse.js');
            setFuseInstance(new Fuse(TOOLS, {
                keys: ['title', 'description', 'keywords'], 
                threshold: 0.3, 
                ignoreLocation: true 
            }));
         } catch (e) {
             console.error("Failed to load search engine", e);
         }
     };
     loadFuse();
  }, []);

  const handleSearch = (e) => {
      const newQuery = e.target.value;
      setQuery(newQuery);

      if (!newQuery.trim()) {
          setFilteredTools([...TOOLS]); 
          return;
      }

      if (fuseInstance) {
          const results = fuseInstance.search(newQuery).map(result => result.item);
          setFilteredTools(results);
      } else {
          const lowerQuery = newQuery.toLowerCase();
          const results = TOOLS.filter(tool => 
              tool.title.toLowerCase().includes(lowerQuery) || 
              tool.description.toLowerCase().includes(lowerQuery)
          );
          setFilteredTools(results);
      }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "MarvelPDF",
    "applicationCategory": "ProductivityApplication",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "A comprehensive suite of free, secure, and powerful PDF tools. Merge, split, compress, and convert documents online.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1250"
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20"> 
      <SEO 
        title="MarvelPDF - The Premium PDF Toolkit"
        description="The ultimate free PDF toolkit. Merge, split, compress, convert, and secure your PDF files online. fast, secure and free."
        keywords="pdf tools, merge pdf, split pdf, compress pdf, pdf converter, free pdf editor"
        schema={jsonLd}
      />
      <UsageBanner />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20 pt-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-red-400 mb-6 animate-[fadeIn_0.6s_ease-out]">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
            New: AI-Powered PDF Summaries
          </div>
          
          <h1 className="font-heading text-5xl md:text-7xl font-bold mb-6 tracking-tight text-white leading-[1.1] animate-[fadeIn_0.6s_ease-out_0.1s_both]">
            Master your PDFs with <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-600">Superhuman Speed</span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-[fadeIn_0.6s_ease-out_0.2s_both]">
            Professional-grade tools to merge, split, convert, and edit documents. 
            Free, secure, and entirely in your browser.
          </p>
          
          {/* Search Bar - Premium Input */}
          <div className="relative max-w-2xl mx-auto group animate-[fadeIn_0.6s_ease-out_0.3s_both]">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-red-500 transition-colors" />
            </div>
            <input
                type="text"
                aria-label="Search tools"
                className="block w-full pl-14 pr-4 py-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:bg-white/10 transition-all text-lg shadow-2xl shadow-black/50"
                placeholder="Search tools (e.g. 'merge', 'sign', 'convert')..."
                value={query}
                onChange={handleSearch}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 opacity-50">
                <kbd className="bg-white/10 px-2 py-1 rounded text-xs font-mono text-gray-400">⌘</kbd>
                <kbd className="bg-white/10 px-2 py-1 rounded text-xs font-mono text-gray-400">K</kbd>
            </div>
          </div>
        </div>

        {/* Tools Grid */}
        <motion.div 
            key={query === '' ? 'all-tools' : 'filtered-tools'} 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" // 4 cols looks more premium than 5 crowded ones
        >
          {filteredTools.map((tool) => (
            <motion.div variants={item} key={tool.to} className="h-full">
                <ToolCard {...tool} />
            </motion.div>
          ))}
          
          {filteredTools.length === 0 && (
              <div className="col-span-full text-center py-20">
                  <p className="text-xl text-gray-400">No tools found for "{query}".</p>
                  <button onClick={() => setQuery('')} className="mt-4 text-red-500 hover:text-red-400">Clear search</button>
              </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
