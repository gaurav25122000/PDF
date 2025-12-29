import React from 'react';
import { Helmet } from 'react-helmet-async';

const About = () => {
  return (
    <div className="min-h-screen bg-white text-gray-800 pt-24 pb-12 px-4 sm:px-6 lg:px-8 absolute inset-0 z-40 overflow-y-auto">
      <Helmet>
        <title>About Us - MarvelPDF</title>
      </Helmet>
      
      <div className="max-w-4xl mx-auto">
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
