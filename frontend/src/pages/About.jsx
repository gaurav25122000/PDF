import React, { useEffect } from 'react';
import SEO from '../components/SEO';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';


const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []); 
  return (
    <div className="min-h-screen bg-white text-gray-800 pt-20 pb-12 px-4 sm:px-6 lg:px-8 absolute inset-0 z-40 overflow-y-auto">
      <SEO 
        title="About Us - MarvelPDF Mission" 
        description="Learn about the MarvelPDF mission. We are dedicated to making PDF tools accessible, fast, and beautiful for everyone."
        keywords="about marvelpdf, pdf tools mission, free pdf software team"
      />
      
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-marvel-black transition-colors font-bold mb-8">
            <ArrowLeft size={20} /> Back to Tools
        </Link>
        <div className="text-center mb-16">
             <h1 className="text-5xl font-heading text-marvel-black mb-6">Our Mission</h1>
             <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                 Making PDF tools accessible, fast, and beautiful for everyone.
             </p>
        </div>

        <div className="prose prose-lg mx-auto text-gray-600">
            <p>
                MarvelPDF was born from a simple frustration: PDF tools are often ugly, slow, or expensive. 
                We wanted to build something different—a suite of tools that feels <strong>premium</strong> but remains <strong>free</strong>.
            </p>
            <p>
                We believe that productivity tools should be a joy to use. That's why we focus heavily on design, 
                user experience, and speed. Whether you're a student merging assignments or a professional signing contracts, 
                MarvelPDF is designed to save you time.
            </p>
            <h3>Our Values</h3>
            <ul>
                <li><strong>Privacy First:</strong> Your data belongs to you. We delete it ASAP.</li>
                <li><strong>Simplicity:</strong> No complex menus. Just drag, drop, and done.</li>
                <li><strong>Quality:</strong> We use the best rendering engines to ensure your PDFs look perfect.</li>
            </ul>
        </div>
      </div>
    </div>
  );
};

export default About;
