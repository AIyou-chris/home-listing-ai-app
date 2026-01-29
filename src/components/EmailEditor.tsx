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

    // Custom toolbar logic
    const [showLinkInput, setShowLinkInput] = React.useState(false);
    const [linkUrl, setLinkUrl] = React.useState('');
    const selectionRangeRef = React.useRef<Range | null>(null);


    // Save selection when clicking the link button
    const handleLinkClick = () => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            selectionRangeRef.current = selection.getRangeAt(0);
            setShowLinkInput(true);
            setLinkUrl('');
        }
    };

    const applyLink = () => {
        if (linkUrl && selectionRangeRef.current) {
            // Restore selection
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(selectionRangeRef.current);
            }
            // Execute command
            document.execCommand('createLink', false, linkUrl);
            // Trigger change handling manually since execCommand might not fire onChange in all cases immediately or we want to ensure sync
            // The Editor component listens to mutation observer usually, so it should be fine.
            // But let's close the popover.
            setShowLinkInput(false);
            setLinkUrl('');
            selectionRangeRef.current = null;
        }
    };

    // Helper for toolbar buttons
    const ToolbarButton = ({ cmd, icon, active = false }: { cmd?: string, icon: React.ReactNode, active?: boolean }) => (
        <button
            type="button"
            onMouseDown={(e) => {
                e.preventDefault(); // Prevent losing focus
                if (cmd) document.execCommand(cmd, false);
            }}
            className={`p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors ${active ? 'bg-slate-200 text-slate-900' : ''}`}
        >
            {icon}
        </button>
    );

    return (
        <div className={`email-editor-wrapper relative ${className || ''}`}>
            <div className="bg-slate-50 border border-slate-200 border-b-0 rounded-t-lg p-2 flex items-center gap-1 flex-wrap">
                <ToolbarButton cmd="bold" icon={<span className="font-bold text-sm">B</span>} />
                <ToolbarButton cmd="italic" icon={<span className="italic text-sm">I</span>} />
                <ToolbarButton cmd="underline" icon={<span className="underline text-sm">U</span>} />
                <ToolbarButton cmd="strikeThrough" icon={<span className="line-through text-sm">S</span>} />
                <div className="w-px h-4 bg-slate-300 mx-1" />
                <ToolbarButton cmd="justifyLeft" icon={<span className="material-symbols-outlined text-[16px]">format_align_left</span>} />
                <ToolbarButton cmd="justifyCenter" icon={<span className="material-symbols-outlined text-[16px]">format_align_center</span>} />
                <ToolbarButton cmd="justifyRight" icon={<span className="material-symbols-outlined text-[16px]">format_align_right</span>} />
                <div className="w-px h-4 bg-slate-300 mx-1" />
                <ToolbarButton cmd="insertUnorderedList" icon={<span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>} />
                <ToolbarButton cmd="insertOrderedList" icon={<span className="material-symbols-outlined text-[16px]">format_list_numbered</span>} />
                <div className="w-px h-4 bg-slate-300 mx-1" />

                {/* Custom Link Button */}
                <button
                    type="button"
                    onClick={handleLinkClick}
                    className={`p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors ${showLinkInput ? 'bg-slate-200 text-purple-600' : ''}`}
                >
                    <span className="material-symbols-outlined text-[16px]">link</span>
                </button>

                {/* Inline Link Popover */}
                {showLinkInput && (
                    <div className="absolute top-10 left-2 z-50 bg-white border border-slate-200 shadow-lg rounded-lg p-2 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-100">
                        <input
                            autoFocus
                            type="text"
                            placeholder="https://example.com"
                            className="text-xs border border-slate-300 rounded px-2 py-1 w-48 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') applyLink();
                                if (e.key === 'Escape') setShowLinkInput(false);
                            }}
                        />
                        <button
                            type="button"
                            onClick={applyLink}
                            className="bg-purple-600 text-white rounded px-2 py-1 text-xs font-bold hover:bg-purple-700"
                        >
                            Add
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowLinkInput(false)}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                    </div>
                )}
            </div>

            <Editor
                value={localValue}
                onChange={handleChange}
                placeholder={placeholder}
                containerProps={{ style: { ...containerStyle, borderTopLeftRadius: 0, borderTopRightRadius: 0 } }}
            >
                {/* Passing empty children or null to suppress default toolbar if library supports it, 
                    but actually react-simple-wysiwyg renders toolbar if no children. 
                    If we pass children, it renders them AS the toolbar. 
                    Wait, looking at the docs/source of react-simple-wysiwyg: 
                    It renders children inside the toolbar div. 
                    So if I pass empty fragment, it might render empty toolbar.
                    However, I implemented my OWN toolbar above the editor.
                    So I should probably pass a dummy hidden div or null to "hide" the default buttons if that works,
                    OR I should put my buttons INSIDE the Editor component as children. 
                    
                    Let's put the buttons INSIDE the Editor to leverage its internal structure?
                    Actually, it's safer to have full control outside if I want custom popovers positioning easily.
                    Appplying CSS to hide the default toolbar might be easier if I render my own.
                    
                    Actually, checking common usage: 
                    <Editor>
                       <BtnBold />
                       ...
                    </Editor>
                    
                    If I pass children, default buttons are GONE.
                    So I can pass a Fragments to hide default, and render my custom one ABOVE.
                    OR I can render my custom buttons AS children.
                    
                    The issue with rendering as children is the `showLinkInput` popover positioning might be constrained by the toolbar overflow.
                    
                    Let's render my Custom Toolbar ABOVE the editor, and pass <></> to the Editor to clear defaults.
                */}
                <></>
            </Editor>
            <style>{`
        .email-editor-wrapper .rsw-editor {
            min-height: 300px;
            border-bottom-left-radius: 0.5rem;
            border-bottom-right-radius: 0.5rem;
            border-top-left-radius: 0;
            border-top-right-radius: 0;
            border-color: #e2e8f0; /* slate-200 */
            border-top: 0;
        }
        /* Hide default toolbar if it still renders empty container */
        .email-editor-wrapper .rsw-toolbar {
            display: none !important;
        }
        .email-editor-wrapper .rsw-editor a {
            color: #2563eb; /* blue-600 */
            text-decoration: underline;
            cursor: pointer;
        }
      `}</style>
        </div>
    );
};
