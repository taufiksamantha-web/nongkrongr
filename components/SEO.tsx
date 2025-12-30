
import React, { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
}

export const SEO: React.FC<SEOProps> = ({ 
  title, 
  description = "Temukan tempat nongkrong asik, cafe hits, dan hidden gems di Sumatera Selatan.", 
  image = "https://res.cloudinary.com/dovouihq8/image/upload/v1762701734/Logo.png",
  type = 'website' 
}) => {
  const siteTitle = "Nongkrongr";
  // Logic: Jika title sama dengan nama situs, jangan tambahkan suffix " | Nongkrongr"
  const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`;

  useEffect(() => {
    // Update Title
    document.title = fullTitle;

    // Helper to update meta tags
    const updateMeta = (name: string, content: string) => {
      let element = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(name.startsWith('og:') ? 'property' : 'name', name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    updateMeta('description', description);
    updateMeta('og:title', fullTitle);
    updateMeta('og:description', description);
    updateMeta('og:image', image);
    updateMeta('og:type', type);
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', fullTitle);
    updateMeta('twitter:description', description);
    updateMeta('twitter:image', image);

  }, [title, description, image, type, fullTitle]);

  return null;
};
