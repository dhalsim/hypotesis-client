import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

import { replaceLinksWithEmbeds } from '../media-embedder';

export type TextViewProps = {
  /** The text content to display */
  text: string;
  classes?: string;
  style?: JSX.CSSProperties;
};

/**
 * Convert URLs in text to clickable links
 */
function linkifyText(text: string): Node[] {
  const urlPattern = /(?:(?:http|https):\/\/|www\.)[^\s]+/gi;
  const html = text.replaceAll(urlPattern, url => {
    const href = url.startsWith('www.') ? `https://${url}` : url;
    
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-brand hover:text-brand-hover">${url}</a>`;
  });
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return Array.from(doc.body.childNodes);
}

/**
 * A component which renders plain text content, converts URLs to clickable links,
 * and replaces recognized media links with embedded video/audio.
 */
export default function TextView({ text, classes, style }: TextViewProps) {
  const content = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (content.current) {
      content.current.replaceChildren(...linkifyText(text));
      
      replaceLinksWithEmbeds(content.current, {
        // Make embeds the full width of the sidebar, unless the sidebar has been
        // made wider than the `md` breakpoint. In that case, restrict width
        // to 380px.
        className: 'w-full md:w-[380px]',
      });
    }
  }, [text]);

  return (
    <div className="w-full break-anywhere cursor-text">
      <div 
        ref={content}
        className={classes} 
        data-testid="text-content" 
        style={style}
      />
    </div>
  );
}
