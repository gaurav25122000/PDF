import React, { useEffect } from 'react';
import { ArrowLeft, Heart, Zap, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const ValueCard = ({ icon: Icon, title, description }) => (
  <div className="bg-gray-50 p-6 rounded-2xl hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100 group">
    <div className="w-12 h-12 bg-marvel-red/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
      <Icon className="w-6 h-6 text-marvel-red" />
    </div>
    <h3 className="font-heading text-lg mb-2 text-marvel-black">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">
      {description}
    </p>
  </div>
);

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

      {/* Background Gradients */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-marvel-red/5 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-50 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-marvel-black transition-colors font-bold">
            <ArrowLeft size={20} /> Back to Tools
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
          <div>
            <h1 className="text-5xl md:text-6xl font-heading text-marvel-black mb-6 leading-tight">
              Making PDFs <br/>
              <span className="text-marvel-red">Legendary.</span>
            </h1>
            <p className="text-xl text-gray-500 mb-8 leading-relaxed">
              MarvelPDF was born from a simple frustration: PDF tools are often ugly, slow, or expensive. 
              We wanted to build something different—a suite of tools that feels <strong>premium</strong> but remains <strong>free</strong>.
            </p>
            <div className="flex gap-4">
              <a href="mailto:support@marvelpdf.com" className="bg-marvel-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-900 transition-colors inline-flex items-center gap-2">
                <Users size={18} /> Join the Community
              </a>
            </div>
          </div>
          <div className="relative">
             <div className="absolute inset-0 bg-gradient-to-tr from-marvel-red/20 to-blue-500/20 rounded-3xl blur-3xl -z-10" />
             <div className="bg-white/50 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-sm">
                <p className="text-2xl font-heading text-marvel-black mb-4">
                  "We believe that productivity tools should be a joy to use. That's why we focus heavily on design, user experience, and speed."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-marvel-red text-white flex items-center justify-center rounded-full font-bold">M</div>
                  <div>
                    <div className="font-bold text-marvel-black">MarvelPDF Team</div>
                    <div className="text-xs text-gray-500">Creators</div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-heading text-marvel-black mb-4">Our Core Values</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              We guide every decision we make by these three principles.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ValueCard 
              icon={Shield}
              title="Privacy First"
              description="Your data belongs to you. We verify no files are stored for more than 2 hours. Security is not an afterthought."
            />
            <ValueCard 
              icon={Zap}
              title="Radical Simplicity"
              description="No complex menus. No 20-step tutorials. Just drag, drop, and done. We design for speed."
            />
            <ValueCard 
              icon={Heart}
              title="Quality Obsession"
              description="We use the best rendering engines to ensure your PDFs look perfect, pixel for pixel, every single time."
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default About;
