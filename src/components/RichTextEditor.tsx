import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Save, X } from 'lucide-react';

interface RichTextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: any) => void;
  initialValue: any;
  title: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialValue,
  title
}) => {
  const [textValue, setTextValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Convert rich text blocks to plain text for editing
      if (Array.isArray(initialValue)) {
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
                  .join('\n');
              }
              return '';
            })
            .join('\n')
            .trim();
        };
        setTextValue(extractText(initialValue));
      } else if (typeof initialValue === 'string') {
        setTextValue(initialValue);
      } else {
        setTextValue('');
      }
    }
  }, [isOpen, initialValue]);

  const handleSave = () => {
    // Convert plain text back to Strapi rich text blocks format
    const lines = textValue.split('\n').filter(line => line.trim());
    const blocks = lines.map(line => ({
      type: 'paragraph',
      children: [{ type: 'text', text: line.trim() }]
    }));

    onSave(blocks.length > 0 ? blocks : null);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Edit {title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-2">
            Enter your content. Each line will become a paragraph.
          </div>
          
          <Textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Enter your content here..."
            className="min-h-[300px] resize-none"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
