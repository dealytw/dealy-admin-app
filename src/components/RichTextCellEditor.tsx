import React, { useState, useRef, useEffect } from 'react';
import { RichTextEditor } from './RichTextEditor';

interface RichTextCellEditorProps {
  value: any;
  onValueChange: (value: any) => void;
  stopEditing: () => void;
  eGridCell: HTMLElement;
}

export const RichTextCellEditor: React.FC<RichTextCellEditorProps> = ({
  value,
  onValueChange,
  stopEditing,
  eGridCell
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    // Open the editor immediately when the cell editor is created
    setIsEditorOpen(true);
  }, []);

  const handleSave = (newValue: any) => {
    setCurrentValue(newValue);
    onValueChange(newValue);
    stopEditing();
  };

  const handleClose = () => {
    stopEditing();
  };

  return (
    <>
      {/* Show a placeholder while editor is loading */}
      <div className="w-full h-full flex items-center px-2 text-gray-500">
        Opening rich text editor...
      </div>
      
      <RichTextEditor
        isOpen={isEditorOpen}
        onClose={handleClose}
        onSave={handleSave}
        initialValue={currentValue}
        title="Rich Text Content"
      />
    </>
  );
};
