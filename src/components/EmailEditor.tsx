import React from 'react';
import Editor from 'react-simple-wysiwyg';

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

    // Local state for immediate updates and debouncing
    const [localValue, setLocalValue] = React.useState(value || '');
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    // Sync local value when prop changes from outside (e.g. stepping through funnel)
    React.useEffect(() => {
        if (value !== localValue) {
            setLocalValue(value || '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleChange = (event: any) => {
        const newValue = event.target.value;
        setLocalValue(newValue);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            onChange(newValue);
        }, 500); // 500ms debounce to prevent flashing/re-renders
    };

    return (
        <div className={`email-editor-wrapper ${className || ''}`}>
            <Editor
                value={localValue}
                onChange={handleChange}
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
        .email-editor-wrapper .rsw-editor a {
            color: #2563eb; /* blue-600 */
            text-decoration: underline;
        }
      `}</style>
        </div>
    );
};
