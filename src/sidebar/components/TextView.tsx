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
 * A component which renders plain text content and replaces recognized links
 * with embedded video/audio.
 */
export default function TextView({ text, classes, style }: TextViewProps) {
  const content = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (content.current) {
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
      >
        {text}
      </div>
    </div>
  );
}
