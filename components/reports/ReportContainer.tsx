import React, { useState } from 'react';
import { Maximize, Minimize, Printer } from 'lucide-react';

interface ReportContainerProps {
    title: string;
    controls: React.ReactNode;
    children: React.ReactNode;
}

const ReportContainer: React.FC<ReportContainerProps> = ({ title, controls, children }) => {
    const [isFullScreen, setIsFullScreen] = useState(false);

    const containerClasses = isFullScreen
        ? "fixed inset-0 z-50 bg-stone-950 p-4 sm:p-6 lg:p-8 overflow-y-auto"
        : "bg-stone-900 p-4 sm:p-6 rounded-xl shadow-lg relative";
    
    const contentWrapperClasses = isFullScreen ? "max-w-5xl mx-auto" : "";

    return (
        <div className={`${containerClasses} ${isFullScreen ? 'printable-area' : ''}`}>
            <style>{`
                @media print {
                    /* Fix for printing truncated content by ensuring no parent elements are clipping the content. */
                    body, #root > div, main {
                        overflow: visible !important;
                        height: auto !important;
                    }

                    body * {
                        visibility: hidden;
                    }
                    .printable-area, .printable-area * {
                        visibility: visible;
                    }
                    .printable-area .print-hide {
                        display: none !important;
                    }
                    .printable-area {
                        position: static !important;
                        overflow: visible !important;
                        height: auto !important;
                        width: 100% !important;
                        padding: 1rem !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .printable-area .bg-stone-900, 
                    .printable-area .bg-stone-800,
                    .printable-area div[class*="bg-"] { 
                        background: transparent !important; 
                        border-radius: 0 !important;
                    }
                    .printable-area h1, .printable-area h3,
                    .printable-area [class*="text-stone-"],
                    .printable-area [class*="text-sky-"],
                    .printable-area [class*="text-rose-"],
                    .printable-area [class*="text-emerald-"] { 
                        color: black !important; 
                    }
                    .printable-area [class*="border-stone-"] { border-color: #ccc !important; }
                    .printable-area .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important; }
                    .printable-area .shadow-lg { box-shadow: none !important; }
                }
            `}</style>
            <div className={contentWrapperClasses}>
                 <div className="flex flex-col sm:flex-row justify-between items-center mb-6 print-hide">
                    <div className={`${isFullScreen ? '' : 'hidden'} sm:block sm:opacity-0 pointer-events-none`}>
                        <h1 className="text-3xl font-bold text-stone-100">{title}</h1>
                    </div>
                    <div className="flex-grow flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4 w-full">
                        {controls}
                    </div>
                    <div className="absolute sm:relative top-4 right-4 sm:top-auto sm:right-auto ml-4 flex items-center gap-2">
                         {isFullScreen && (
                            <button
                                onClick={() => window.print()}
                                className="p-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white"
                                title="列印或儲存為 PDF"
                            >
                                <Printer size={18} />
                            </button>
                         )}
                         <button
                            onClick={() => setIsFullScreen(!isFullScreen)}
                            className="p-2 rounded-lg bg-stone-700 hover:bg-stone-600"
                            title={isFullScreen ? "結束全螢幕" : "全螢幕"}
                        >
                            {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
};

export default ReportContainer;
