import React, { useRef, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Download, Upload, LogIn, LogOut, UserPlus, Save, RotateCcw, AlertTriangle, Users } from 'lucide-react';
import { JournalEntry, UserProfile } from '../../types';
import ConfirmationModal from '../ui/ConfirmationModal';

const SyncAndBackupView: React.FC = () => {
    const { state, dispatch, googleSignIn, googleSignOut, saveToCloud, restoreFromCloud, activeProfile } = useData();
    const { googleUser, profiles } = state;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');

    const handleCreateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        if (newProfileName.trim()) {
            const newProfile: UserProfile = {
                id: Date.now().toString(),
                name: newProfileName.trim()
            };
            dispatch({ type: 'ADD_PROFILE', payload: newProfile });
            setNewProfileName('');
            setIsProfileModalOpen(false);
        }
    };
    
    const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch({ type: 'SELECT_PROFILE', payload: e.target.value });
    };

    const handleJournalExport = () => {
        const { journalEntries } = state.data[state.activeProfileId!] || { journalEntries: [] };
        if (journalEntries.length === 0) {
            alert('目前使用者沒有可匯出的日記簿資料。');
            return;
        }
        const dataStr = JSON.stringify(journalEntries, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `${activeProfile?.name || 'journal'}-backup-${date}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleJournalFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const importedEntries: JournalEntry[] = JSON.parse(text);
                    // Basic validation
                    if (!Array.isArray(importedEntries) || (importedEntries.length > 0 && !importedEntries[0].id)) {
                        throw new Error('檔案格式不符。');
                    }
                    dispatch({ type: 'MERGE_JOURNAL_ENTRIES', payload: importedEntries });
                    alert(`日記簿已成功合併匯入！`);
                } catch (error: any) {
                    alert(`匯入失敗：${error.message}`);
                }
            };
            reader.readAsText(file);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
             {state.isLoading && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"><div className="text-white">處理中...</div></div>}

            {/* Google Account Section */}
            <div className="bg-stone-900 p-6 rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                {googleUser ? (
                    <div className="flex items-center gap-4">
                        <img src={googleUser.picture} alt="avatar" className="w-12 h-12 rounded-full" />
                        <div>
                            <p className="font-semibold text-stone-100">{googleUser.name}</p>
                            <p className="text-sm text-stone-400">{googleUser.email}</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-stone-300">請登入 Google 帳號以啟用雲端同步功能。</div>
                )}
                <button
                    onClick={googleUser ? googleSignOut : googleSignIn}
                    className="flex items-center bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700 transition-colors duration-200 shadow w-full sm:w-auto justify-center"
                >
                    {googleUser ? <LogOut size={20} className="mr-2" /> : <LogIn size={20} className="mr-2" />}
                    {googleUser ? '登出' : '使用 Google 登入'}
                </button>
            </div>

            {/* Profile Management Section */}
            {googleUser && (
                <div className="bg-stone-900 p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl font-bold text-stone-100 mb-4 flex items-center"><Users size={22} className="mr-3 text-amber-400"/>使用者設定檔</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <select onChange={handleProfileChange} value={state.activeProfileId || ''} className="w-full sm:w-auto flex-grow p-3 bg-stone-800 border border-stone-600 rounded-lg">
                            <option value="">-- 選擇使用者 --</option>
                            {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center bg-amber-600 text-white px-5 py-3 rounded-lg hover:bg-amber-700 transition w-full sm:w-auto justify-center">
                            <UserPlus size={20} className="mr-2"/> 建立新使用者
                        </button>
                    </div>
                </div>
            )}
            
            {/* Cloud Sync Section */}
            <div className="bg-stone-900 p-6 rounded-xl shadow-lg border border-amber-500/30">
                <h3 className="text-xl font-bold text-amber-400 mb-4">雲端同步 (完整備份)</h3>
                <p className="text-stone-400 mb-6">
                    將您的 <strong className="text-amber-300">所有使用者設定檔及帳務資料</strong> 儲存至您的 Google Drive，或從中還原。
                    從雲端還原會 <strong className="text-rose-400">完全覆蓋</strong> 目前本機的所有資料。
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={saveToCloud} disabled={!googleUser} className="flex-1 flex items-center justify-center bg-emerald-600 text-white px-5 py-3 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        <Save size={20} className="mr-2"/> 儲存至雲端硬碟
                    </button>
                    <button onClick={() => setIsConfirmRestoreOpen(true)} disabled={!googleUser} className="flex-1 flex items-center justify-center bg-rose-600 text-white px-5 py-3 rounded-lg hover:bg-rose-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                        <RotateCcw size={20} className="mr-2"/> 從雲端硬碟還原
                    </button>
                </div>
            </div>

            {/* Journal Import/Export */}
            <div className="bg-stone-900 p-6 rounded-xl shadow-lg">
                 <h3 className="text-xl font-bold text-stone-100 mb-4">日記簿備份 (目前使用者)</h3>
                 <p className="text-stone-400 mb-6">
                    僅針對目前選擇的使用者 ({activeProfile?.name || '無'}) 進行日記簿的匯出或匯入。匯入會以 <strong className="text-sky-300">合併模式</strong> 進行，不會覆蓋現有傳票。
                </p>
                 <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleJournalExport} disabled={!activeProfile} className="flex-1 flex items-center justify-center bg-sky-600 text-white px-5 py-3 rounded-lg hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                       <Download size={20} className="mr-2" /> 匯出日記簿
                    </button>
                    <input type="file" accept=".json" ref={fileInputRef} onChange={handleJournalFileSelect} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={!activeProfile} className="flex-1 flex items-center justify-center bg-sky-800 text-white px-5 py-3 rounded-lg hover:bg-sky-900 transition disabled:opacity-50 disabled:cursor-not-allowed">
                       <Upload size={20} className="mr-2" /> 匯入日記簿
                    </button>
                 </div>
            </div>

            {isProfileModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-stone-800 rounded-lg p-6 w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-4">建立新使用者</h3>
                        <form onSubmit={handleCreateProfile}>
                            <input
                                type="text"
                                value={newProfileName}
                                onChange={e => setNewProfileName(e.target.value)}
                                placeholder="請輸入使用者名稱"
                                className="w-full p-2 bg-stone-700 border border-stone-600 rounded"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setIsProfileModalOpen(false)} className="px-4 py-2 bg-stone-600 rounded">取消</button>
                                <button type="submit" className="px-4 py-2 bg-amber-600 rounded">建立</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {isConfirmRestoreOpen && (
                 <ConfirmationModal
                    isOpen={isConfirmRestoreOpen}
                    onClose={() => setIsConfirmRestoreOpen(false)}
                    onConfirm={() => { restoreFromCloud(); setIsConfirmRestoreOpen(false); }}
                    title="確認從雲端還原資料"
                    message={
                        <div className="text-sm text-stone-300">
                           <p className="font-bold text-base text-stone-100 mb-2">您確定要繼續嗎？</p>
                           <p className="font-bold text-rose-400 my-2">這將會用雲端硬碟的備份，完全覆蓋並取代目前本機的所有資料。</p>
                           <p>此操作無法復原。</p>
                        </div>
                    }
                />
            )}
        </div>
    );
};

export default SyncAndBackupView;
