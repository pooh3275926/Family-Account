import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-900/50">
                     <AlertTriangle className="h-6 w-6 text-rose-400" aria-hidden="true" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                    <p className="text-lg leading-6 font-medium text-stone-100">{message}</p>
                </div>
            </div>
            <div className="mt-5 sm:mt-6 grid grid-cols-2 gap-3">
                 <button
                    type="button"
                    className="inline-flex justify-center w-full rounded-md border border-stone-600 shadow-sm px-4 py-2 bg-stone-800 text-base font-medium text-stone-200 hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 sm:text-sm"
                    onClick={onClose}
                >
                    取消
                </button>
                <button
                    type="button"
                    className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-rose-600 text-base font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 sm:text-sm"
                    onClick={onConfirm}
                >
                    確定刪除
                </button>
            </div>
        </Modal>
    );
};

export default ConfirmationModal;