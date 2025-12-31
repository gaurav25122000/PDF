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
  const [filteredTools, setFilteredTools] = useState([...TOOLS]); // Use a Copy
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
          setFilteredTools([...TOOLS]); // Reset to full list immediately
          return;
      }

      if (fuseInstance) {
          // Use Fuse if loaded
          const results = fuseInstance.search(newQuery).map(result => result.item);
          setFilteredTools(results);
      } else {
          // Fallback simple search if Fuse not ready yet
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
      transition: {
        staggerChildren: 0.1
      }
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
    <div className="bg-gray-50 min-h-screen">
      <SEO 
        title="The Superhero of PDF Tools - Merge, Split, Convert"
        description="The ultimate free PDF toolkit. Merge, split, compress, convert, and secure your PDF files online. No installation required. fast, secure and free."
        keywords="pdf tools, merge pdf, split pdf, compress pdf, pdf converter, free pdf editor"
        schema={jsonLd}
      />
      <UsageBanner />

      <div className="bg-marvel-black text-white py-20 px-4">
        <div className="w-full px-4 text-center">
          {/* Static HTML for LCP optimization - CSS animation only */}
          <h1 className="font-heading text-4xl md:text-5xl font-extrabold mb-6 tracking-tighter uppercase w-full block animate-[fadeIn_0.6s_ease-out]">
            Unleash the Power of <span className="text-marvel-red">PDFs</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto animate-[fadeIn_0.6s_ease-out_0.2s_both]">
            The most powerful PDF tools in the multiverse. Merge, split, compress, and conquer your documents with just a few clicks.
          </p>
          
          {/* Search Bar - Keep motion or make static? Static is safer for CLS/LCP */}
          <div className="relative max-w-xl mx-auto group animate-[fadeIn_0.6s_ease-out_0.3s_both]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-gray-500 group-focus-within:text-marvel-red transition-colors" />
            </div>
            <input
                type="text"
                aria-label="Search tools"
                className="block w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 border border-gray-700 backdrop-blur-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-marvel-red focus:bg-white/20 transition-all text-lg"
                placeholder="Search for tools (e.g. 'merge', 'word', 'sign')..."
                value={query}
                onChange={handleSearch}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 -mt-10">
        <motion.div 
            key={query === '' ? 'all-tools' : 'filtered-tools'} 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6"
        >
          {filteredTools.map((tool) => (
            <motion.div variants={item} key={tool.to} className="h-full">
                <ToolCard {...tool} />
            </motion.div>
          ))}
          
          {filteredTools.length === 0 && (
              <div className="col-span-full text-center py-20 text-gray-500">
                  <p className="text-xl">No tools found for "{query}". Try a different search term.</p>
              </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Home;
