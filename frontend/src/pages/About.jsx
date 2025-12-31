import React, { useEffect } from 'react';
import { ArrowLeft, Heart, Zap, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const ValueCard = ({ icon: Icon, title, description, colorClass, bgClass }) => (
  <div className="bg-white/5 p-6 rounded-2xl hover:bg-white/10 transition-all border border-white/10 group backdrop-blur-sm">
    <div className={`w-12 h-12 ${bgClass} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      <Icon className={`w-6 h-6 ${colorClass}`} />
    </div>
    <h3 className="font-heading text-lg mb-2 text-white">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed">
      {description}
    </p>
  </div>
);

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []); 

  return (
    <div className="min-h-screen py-24 px-4 sm:px-6 lg:px-8 relative z-10">
      <SEO 
        title="About Us - MarvelPDF Mission" 
        description="Learn about the MarvelPDF mission. We are dedicated to making PDF tools accessible, fast, and beautiful for everyone."
        keywords="about marvelpdf, mission, team, values"
      />

      {/* Background Elements */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-red-600/10 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2 -z-10" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2 -z-10" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8 md:mb-12">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium group text-sm">
             <div className="p-2 bg-white/5 rounded-lg border border-white/10 group-hover:bg-white/10 transition-all">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            </div>
            Back to Tools
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center mb-16 md:mb-24">
          <div className="order-2 lg:order-1">
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6 leading-tight tracking-tight">
              Making PDFs <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Legendary.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-8 leading-relaxed max-w-lg">
              MarvelPDF was born from a simple frustration: PDF tools are often ugly, slow, or expensive. 
              We wanted to build something different—a suite of tools that feels <strong className="text-white">premium</strong> but remains <strong className="text-white">free</strong>.
            </p>
            <div className="flex gap-4">
              <a href="mailto:support@marvelpdf.com" className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 inline-flex items-center gap-2 text-sm md:text-base">
                <Users size={18} /> Join the Community
              </a>
            </div>
          </div>
          
          <div className="relative order-1 lg:order-2">
             <div className="absolute inset-0 bg-gradient-to-tr from-red-500/10 to-blue-500/10 rounded-3xl blur-3xl -z-10 transform rotate-3" />
             <div className="bg-black/40 backdrop-blur-xl p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl">
                <div className="mb-6 text-red-500">
                    <Heart size={40} className="fill-current" />
                </div>
                <p className="text-xl md:text-2xl font-heading text-white mb-6 italic">
                  "We believe that productivity tools should be a joy to use. That's why we focus heavily on design, user experience, and speed."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white text-black flex items-center justify-center rounded-full font-bold">M</div>
                  <div>
                    <div className="font-bold text-white">MarvelPDF Team</div>
                    <div className="text-xs text-gray-500">Creators</div>
                  </div>
                </div>
             </div>
          </div>
        </div>

        <div className="mb-16 md:mb-20">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-white mb-3">Our Core Values</h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              We guide every decision we make by these three principles.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ValueCard 
              icon={Shield}
              title="Privacy First"
              description="Your data belongs to you. We verify no files are stored for more than 2 hours. Security is not an afterthought."
              bgClass="bg-blue-500/10"
              colorClass="text-blue-500"
            />
            <ValueCard 
              icon={Zap}
              title="Radical Simplicity"
              description="No complex menus. No 20-step tutorials. Just drag, drop, and done. We design for speed."
              bgClass="bg-yellow-500/10"
              colorClass="text-yellow-500"
            />
            <ValueCard 
              icon={Heart}
              title="Quality Obsession"
              description="We use the best rendering engines to ensure your PDFs look perfect, pixel for pixel, every single time."
              bgClass="bg-red-500/10"
              colorClass="text-red-500"
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default About;
