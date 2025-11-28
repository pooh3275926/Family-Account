
import React, { useRef, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Download, Upload, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import Modal from '../ui/Modal';
import { Account, JournalEntry } from '../../types';

type RestoreMode = 'merge' | 'overwrite';

const BackupRestoreView: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
    const [tempBackupData, setTempBackupData] = useState<{ accounts: Account[], journalEntries: JournalEntry[] } | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
    
    // Restore Options State
    const [accountMode, setAccountMode] = useState<RestoreMode>('merge');
    const [journalMode, setJournalMode] = useState<RestoreMode>('merge');

    const handleDownloadBackup = () => {
        try {
            setFeedback(null);
            const backupData = {
                accounts: state.accounts,
                journalEntries: state.journalEntries,
            };
            const dataStr = JSON.stringify(backupData, null, 2);
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
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text !== 'string') {
                        throw new Error('無法讀取檔案內容。');
                    }
                    const backupData = JSON.parse(text);

                    // Basic validation
                    if (!Array.isArray(backupData.accounts) || !Array.isArray(backupData.journalEntries)) {
                        throw new Error('檔案格式不符，缺少會計科目或日記帳資料。');
                    }
                    
                    setTempBackupData(backupData);
                    // Reset defaults
                    setAccountMode('merge');
                    setJournalMode('merge');
                    setIsRestoreModalOpen(true);

                } catch (error: any) {
                    console.error('Failed to parse backup:', error);
                    setFeedback({ type: 'error', message: `讀取檔案失敗：${error.message}` });
                }
            };
            reader.onerror = () => {
                setFeedback({ type: 'error', message: '讀取檔案時發生錯誤。' });
            };
            reader.readAsText(file);
        }
        // Reset file input value to allow selecting the same file again
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleExecuteRestore = () => {
        if (!tempBackupData) return;
        
        try {
            dispatch({
                type: 'RESTORE_DATA',
                payload: {
                    backupAccounts: tempBackupData.accounts,
                    backupEntries: tempBackupData.journalEntries,
                    accountMode,
                    journalMode
                }
            });
            
            const accAction = accountMode === 'merge' ? '合併' : '覆蓋';
            const jrnAction = journalMode === 'merge' ? '合併' : '覆蓋';

            setFeedback({ 
                type: 'success', 
                message: `還原完成！ 會計科目: ${accAction}, 日記帳: ${jrnAction}。` 
            });

        } catch (error: any) {
            setFeedback({ type: 'error', message: `還原過程發生錯誤：${error.message}` });
        } finally {
            setIsRestoreModalOpen(false);
            setTempBackupData(null);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-stone-900 p-6 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-stone-100 mb-4">資料備份</h3>
                <p className="text-stone-400 mb-6">
                    點擊下方按鈕，可以將目前的**會計科目**與**日記帳**資料下載成一個 JSON 檔案。請妥善保管此檔案。
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
                    <Database size={22} className="mr-3" />
                    資料還原
                </h3>
                <p className="text-stone-400 mb-6">
                    上傳備份檔案後，您可以選擇要**合併**（保留現有，新增缺少）或**覆蓋**（完全使用備份檔）資料。
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

            {isRestoreModalOpen && (
                 <Modal
                    isOpen={isRestoreModalOpen}
                    onClose={() => {
                        setIsRestoreModalOpen(false);
                        setTempBackupData(null);
                    }}
                    title="資料還原選項"
                >
                    <div className="space-y-6">
                        <div className="bg-amber-900/20 p-4 rounded-lg flex items-start">
                            <AlertTriangle className="text-amber-500 mr-3 shrink-0 mt-0.5" size={20} />
                            <div className="text-sm text-amber-200">
                                <p>請選擇還原模式。若選擇「覆蓋」，原本的資料將會被備份檔案中的資料完全取代且無法復原。</p>
                            </div>
                        </div>

                        {/* Account Options */}
                        <div className="bg-stone-800 p-4 rounded-lg border border-stone-700">
                            <h4 className="font-bold text-stone-200 mb-3 flex items-center">
                                <span className="bg-stone-700 px-2 py-0.5 rounded text-xs mr-2">1</span>
                                會計科目 (Chart of Accounts)
                            </h4>
                            <div className="space-y-2">
                                <label className="flex items-center p-2 rounded cursor-pointer hover:bg-stone-700/50">
                                    <input 
                                        type="radio" 
                                        name="accountMode" 
                                        value="merge" 
                                        checked={accountMode === 'merge'} 
                                        onChange={() => setAccountMode('merge')}
                                        className="w-4 h-4 text-amber-600 bg-stone-700 border-stone-500 focus:ring-amber-500"
                                    />
                                    <div className="ml-3">
                                        <span className="block text-sm font-medium text-stone-200">合併 (Merge)</span>
                                        <span className="block text-xs text-stone-400">保留現有科目，僅新增備份中獨有的新科目。</span>
                                    </div>
                                </label>
                                <label className="flex items-center p-2 rounded cursor-pointer hover:bg-stone-700/50">
                                    <input 
                                        type="radio" 
                                        name="accountMode" 
                                        value="overwrite" 
                                        checked={accountMode === 'overwrite'} 
                                        onChange={() => setAccountMode('overwrite')}
                                        className="w-4 h-4 text-rose-600 bg-stone-700 border-stone-500 focus:ring-rose-500"
                                    />
                                    <div className="ml-3">
                                        <span className="block text-sm font-medium text-rose-300">覆蓋 (Overwrite)</span>
                                        <span className="block text-xs text-stone-400">刪除所有現有科目，完全使用備份檔中的科目表。</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Journal Options */}
                        <div className="bg-stone-800 p-4 rounded-lg border border-stone-700">
                            <h4 className="font-bold text-stone-200 mb-3 flex items-center">
                                <span className="bg-stone-700 px-2 py-0.5 rounded text-xs mr-2">2</span>
                                日記帳分錄 (Journal Entries)
                            </h4>
                            <div className="space-y-2">
                                <label className="flex items-center p-2 rounded cursor-pointer hover:bg-stone-700/50">
                                    <input 
                                        type="radio" 
                                        name="journalMode" 
                                        value="merge" 
                                        checked={journalMode === 'merge'} 
                                        onChange={() => setJournalMode('merge')}
                                        className="w-4 h-4 text-amber-600 bg-stone-700 border-stone-500 focus:ring-amber-500"
                                    />
                                    <div className="ml-3">
                                        <span className="block text-sm font-medium text-stone-200">合併 (Merge)</span>
                                        <span className="block text-xs text-stone-400">保留現有分錄，僅新增備份中獨有的新分錄 (依傳票ID比對)。</span>
                                    </div>
                                </label>
                                <label className="flex items-center p-2 rounded cursor-pointer hover:bg-stone-700/50">
                                    <input 
                                        type="radio" 
                                        name="journalMode" 
                                        value="overwrite" 
                                        checked={journalMode === 'overwrite'} 
                                        onChange={() => setJournalMode('overwrite')}
                                        className="w-4 h-4 text-rose-600 bg-stone-700 border-stone-500 focus:ring-rose-500"
                                    />
                                    <div className="ml-3">
                                        <span className="block text-sm font-medium text-rose-300">覆蓋 (Overwrite)</span>
                                        <span className="block text-xs text-stone-400">刪除所有現有分錄，完全使用備份檔中的日記帳。</span>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                onClick={() => {
                                    setIsRestoreModalOpen(false);
                                    setTempBackupData(null);
                                }}
                                className="px-4 py-2 text-sm font-medium text-stone-300 bg-stone-800 border border-stone-600 rounded-lg hover:bg-stone-700"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleExecuteRestore}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-lg flex items-center ${
                                    (accountMode === 'overwrite' || journalMode === 'overwrite') 
                                    ? 'bg-rose-600 hover:bg-rose-700' 
                                    : 'bg-amber-600 hover:bg-amber-700'
                                }`}
                            >
                                <Database size={16} className="mr-2" />
                                確認還原
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default BackupRestoreView;
