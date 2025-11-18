import React, { useRef, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import ConfirmationModal from '../ui/ConfirmationModal';

const BackupRestoreView: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [fileToRestore, setFileToRestore] = useState<File | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

    const handleDownloadBackup = () => {
        try {
            setFeedback(null);
            const dataStr = JSON.stringify(state, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `accounting-backup-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setFeedback({ type: 'success', message: '備份檔案已成功下載！' });
        } catch (error) {
            console.error('Failed to create backup:', error);
            setFeedback({ type: 'error', message: '建立備份檔案時發生錯誤。' });
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFeedback(null);
            setFileToRestore(file);
            setIsConfirmOpen(true);
        }
        // Reset file input value to allow selecting the same file again
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleConfirmRestore = () => {
        if (!fileToRestore) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error('無法讀取檔案內容。');
                }
                const newState = JSON.parse(text);

                // Basic validation
                if (!newState.accounts || !newState.journalEntries) {
                    throw new Error('檔案格式不符，缺少必要的資料欄位。');
                }

                dispatch({ type: 'SET_STATE', payload: newState });
                setFeedback({ type: 'success', message: '資料已成功還原！' });
            } catch (error: any) {
                console.error('Failed to restore from backup:', error);
                setFeedback({ type: 'error', message: `還原失敗：${error.message}` });
            } finally {
                setIsConfirmOpen(false);
                setFileToRestore(null);
            }
        };
        reader.onerror = () => {
            setFeedback({ type: 'error', message: '讀取檔案時發生錯誤。' });
            setIsConfirmOpen(false);
            setFileToRestore(null);
        };
        reader.readAsText(fileToRestore);
    };

    return (
        <div className="space-y-8">
            <div className="bg-stone-900 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-stone-100 mb-4">資料備份</h3>
                <p className="text-stone-400 mb-6">
                    點擊下方按鈕，可以將目前所有的帳務資料（包含會計科目、日記帳、信用卡帳本等）下載成一個 JSON 檔案。請妥善保管此檔案。
                </p>
                <button
                    onClick={handleDownloadBackup}
                    className="flex items-center bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700 transition-colors duration-200 shadow"
                >
                    <Download size={20} className="mr-2" />
                    下載備份檔案
                </button>
            </div>

            <div className="bg-stone-900 p-6 rounded-xl shadow-lg border border-rose-500/30">
                <h3 className="text-xl font-bold text-rose-400 mb-4 flex items-center">
                    <AlertTriangle size={22} className="mr-3" />
                    資料還原
                </h3>
                <p className="text-stone-400 mb-6">
                    從備份檔案還原將會<strong className="text-rose-400">完全覆蓋</strong>目前應用程式中的所有資料，此操作無法復原。請謹慎操作。
                </p>
                <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center bg-rose-600 text-white px-5 py-3 rounded-lg hover:bg-rose-700 transition-colors duration-200 shadow"
                >
                    <Upload size={20} className="mr-2" />
                    選擇檔案並還原
                </button>
            </div>
            
            {feedback && (
                <div className={`p-4 rounded-lg flex items-center ${feedback.type === 'success' ? 'bg-emerald-900/50 text-emerald-300' : 'bg-rose-900/50 text-rose-300'}`}>
                    {feedback.type === 'success' ? <CheckCircle className="mr-3" /> : <AlertTriangle className="mr-3" />}
                    {feedback.message}
                </div>
            )}

            {isConfirmOpen && (
                 <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmRestore}
                    title="確認還原資料"
                    message={
                        <div className="text-sm text-stone-300">
                           <p className="font-bold text-base text-stone-100 mb-2">您確定要繼續嗎？</p>
                           <p>這將會用檔案 <strong className="text-amber-400">{fileToRestore?.name}</strong> 內的資料</p>
                           <p className="font-bold text-rose-400 my-2">完全覆蓋並取代目前所有的帳務記錄。</p>
                           <p>此操作無法復原。</p>
                        </div>
                    }
                />
            )}
        </div>
    );
};

export default BackupRestoreView;