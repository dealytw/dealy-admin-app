import React from 'react';

interface RichTextRendererProps {
  value: any;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({ value }) => {
  if (!value) return <span className="text-gray-400">No content</span>;
  
  // If it's already a string, return it
  if (typeof value === 'string') {
    return <span>{value}</span>;
  }
  
  // If it's an array of blocks (Strapi rich text format)
  if (Array.isArray(value)) {
    const extractText = (blocks: any[]): string => {
      return blocks
        .map(block => {
          if (block.type === 'paragraph' && block.children) {
            return block.children
              .map((child: any) => child.text || '')
              .join('');
          }
          if (block.type === 'heading' && block.children) {
            return block.children
              .map((child: any) => child.text || '')
              .join('');
          }
          if (block.type === 'list' && block.children) {
            return block.children
              .map((item: any) => 
                item.children
                  ?.map((child: any) => child.text || '')
                  .join('') || ''
              )
              .join(', ');
          }
          return '';
        })
        .join(' ')
        .trim();
    };
    
    const text = extractText(value);
    return (
      <span 
        className="text-sm" 
        title={text}
        style={{ 
          maxWidth: '200px', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'inline-block'
        }}
      >
        {text || 'No content'}
      </span>
    );
  }
  
  // If it's an object, try to extract text from it
  if (typeof value === 'object') {
    const text = JSON.stringify(value);
    return (
      <span 
        className="text-xs text-gray-500" 
        title={text}
        style={{ 
          maxWidth: '150px', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'inline-block'
        }}
      >
        {text.length > 50 ? `${text.substring(0, 50)}...` : text}
      </span>
    );
  }
  
  return <span className="text-gray-400">Invalid content</span>;
};
