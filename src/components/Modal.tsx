import React from 'react';

interface ModalProps {
    title: React.ReactNode;
    onClose: () => void;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children }) => {
    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={onClose}
        >
            <div
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg m-4"
                onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
            >
                <div className="flex items-start justify-between p-5 border-b border-slate-200">
                    <div className="flex-1">
                      {typeof title === 'string' 
                          ? <h3 className="text-xl font-bold text-slate-800">{title}</h3> 
                          : title
                      }
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 -mt-1 -mr-1 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                    >
                        <span className="material-symbols-outlined w-6 h-6">close</span>
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};

export default Modal;