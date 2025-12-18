import React from 'react';
import { Editor } from 'react-simple-wysiwyg';

interface EmailEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
}

export const EmailEditor: React.FC<EmailEditorProps> = ({
    value,
    onChange,
    placeholder,
    className,
    style
}) => {
    // Custom toolbar configuration to keep it simple as requested
    // "Text, Links, Images, and basic Lists"
    const containerStyle: React.CSSProperties = {
        minHeight: '300px', // Ensure a decent tailored height
        ...style
    };

    return (
        <div className={`email-editor-wrapper ${className || ''}`}>
            <Editor
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                containerProps={{ style: containerStyle }}
            />
            <style>{`
        .email-editor-wrapper .rsw-editor {
            min-height: 300px;
            border-radius: 0.5rem;
            border-color: #e2e8f0; /* slate-200 */
        }
        .email-editor-wrapper .rsw-toolbar {
            border-top-left-radius: 0.5rem;
            border-top-right-radius: 0.5rem;
            background-color: #f8fafc; /* slate-50 */
        }
      `}</style>
        </div>
    );
};
