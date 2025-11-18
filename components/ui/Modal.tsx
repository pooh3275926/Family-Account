
import React, { ReactNode } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className={`bg-stone-900 rounded-xl shadow-2xl w-full ${sizeClasses[size]} flex flex-col max-h-[90vh]`}>
                <div className="flex justify-between items-center p-4 border-b border-stone-700">
                    <h3 id="modal-title" className="text-xl font-semibold text-stone-100">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-stone-400 bg-transparent hover:bg-stone-700 hover:text-white rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
                        aria-label="Close modal"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                        </svg>
                    </button>
                </div>
                <div className="p-6 space-y-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;