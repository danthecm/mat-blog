'use client';

import React from 'react';
import parse, { domToReact } from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { resolveImageUrl } from '@/src/components/utils/imageHelper';

/**
 * RichTextRenderer safely renders HTML content with custom styling and component mapping.
 * Follows best practices for security (sanitization) and accessibility.
 */
const RichTextRenderer = ({ content, className = "" }) => {
  if (!content) return null;

  // 1. Sanitize the HTML to prevent XSS
  const sanitizedContent = DOMPurify.sanitize(content, {
    ADD_ATTR: ['target', 'rel'], // Allow some extra attributes if needed
    USE_PROFILES: { html: true },
  });

  // 2. Replace &nbsp; and literal non-breaking spaces (\u00A0) with regular spaces 
  // to prevent layout overflow in paragraphs that use them instead of regular spaces.
  const processedContent = sanitizedContent.replace(/&nbsp;|\u00A0/g, ' ');

  // 3. Options for html-react-parser to customize element rendering
  const options = {
    replace: (domNode) => {
      // Handle images to ensure they use resolveImageUrl and have proper styling
      if (domNode.name === 'img') {
        const { src, alt, width, height, ...attribs } = domNode.attribs;
        return (
          <figure className="my-8 group">
            <img 
              src={resolveImageUrl(src)} 
              alt={alt || "Blog content image"} 
              className="w-full h-auto rounded-xl shadow-lg border border-gray-100 transition-transform duration-300 group-hover:scale-[1.01]"
              loading="lazy"
              {...attribs}
            />
            {alt && (
              <figcaption className="mt-3 text-center text-sm text-gray-500 italic">
                {alt}
              </figcaption>
            )}
          </figure>
        );
      }

      // Handle external links to add security attributes
      if (domNode.name === 'a') {
        const { href } = domNode.attribs;
        const isExternal = href && (href.startsWith('http') || href.startsWith('//'));
        
        if (isExternal) {
          domNode.attribs.target = "_blank";
          domNode.attribs.rel = "noopener noreferrer";
        }
      }

      // Handle tables to make them responsive
      if (domNode.name === 'table') {
        return (
          <div className="overflow-x-auto my-8 border border-gray-200 rounded-lg shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              {domToReact(domNode.children, options)}
            </table>
          </div>
        );
      }
    }
  };

  return (
    <div className={`blog-content prose prose-lg max-w-none ${className}`}>
      {parse(processedContent, options)}
    </div>
  );
};

export default RichTextRenderer;
