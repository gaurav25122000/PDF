import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SEO = ({ title, description, keywords, image, type = 'website', schema }) => {
  const location = useLocation();
  const siteUrl = window.location.origin;
  const currentUrl = `${siteUrl}${location.pathname}`;
  const defaultImage = `${siteUrl}/og-image.jpg`; // Ensure this exists or fallback
  const finalImage = image ? (image.startsWith('http') ? image : `${siteUrl}${image}`) : defaultImage;

  const defaultTitle = "MarvelPDF - The Superhero of PDF Tools";
  const defaultDescription = "Unleash the power of your documents. Merge, split, compress, and conquer your PDFs with MarvelPDF. Free, secure, and powerful.";

  const fullTitle = title ? `${title} | MarvelPDF` : defaultTitle;
  const metaDescription = description || defaultDescription;

  // Hreflang logic (example usage: passing [{ lang: 'es', url: 'https://es.marvelpdf.com' }])
  const hrefLangs = [
    { lang: 'en', url: `${siteUrl}${location.pathname}` },
    // In a real multi-lingual app, you'd dynamically generate this or pass generic alternatives
  ];

  return (
    <Helmet
      htmlAttributes={{
        lang: 'en', // Default to English, can be made dynamic prop
      }}
    >
      {/* Basic Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={currentUrl} />

      {/* Multilingual SEO */}
      {hrefLangs.map((hl) => (
        <link key={hl.lang} rel="alternate" hreflang={hl.lang} href={hl.url} />
      ))}
      <link rel="alternate" hreflang="x-default" href={siteUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:site_name" content="MarvelPDF" />
      <meta property="og:locale" content="en_US" />
      {/* Example for other locales: <meta property="og:locale:alternate" content="es_ES" /> */}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={finalImage} />

      {/* Structured Data (JSON-LD) */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
