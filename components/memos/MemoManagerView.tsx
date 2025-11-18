
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import Modal from '../ui/Modal';
import ConfirmationModal from '../ui/ConfirmationModal';
import { Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const MemoEditForm: React.FC<{
    accountId: string;
    oldMemo: string;
    onClose: () => void;
}> = ({ accountId, oldMemo, onClose }) => {
    const { dispatch } = useAppContext();
    const [text, setText] = useState(oldMemo);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!text.trim()) {
            setError('摘要文字不能為空。');
            return;
        }
        dispatch({ type: 'UPDATE_MEMOS_BY_ACCOUNT', payload: { accountId, oldMemo, newMemo: text.trim() } });
        onClose();
    };
    
    const inputClass = "bg-stone-800 border border-stone-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2.5 placeholder-stone-400";

    return (
        <Modal isOpen={true} onClose={onClose} title="編輯摘要">
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-stone-200">摘要內容</label>
                        <p className="text-xs text-stone-400 mb-2">請注意：此變更將會更新所有使用此摘要的相關分錄。</p>
                        <input
                            type="text"
                            value={text}
                            onChange={e => setText(e.target.value)}
                            className={inputClass}
                            required
                            autoFocus
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
                <div className="flex justify-end mt-6 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-stone-200 bg-stone-800 border border-stone-600 rounded-lg hover:bg-stone-700">
                        取消
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:ring-4 focus:outline-none focus:ring-amber-800">
                        儲存
                    </button>
                </div>
            </form>
        </Modal>
    );
};


const MemoManagerView: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { journalEntries, accounts } = state;
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingMemoInfo, setEditingMemoInfo] = useState<{ accountId: string, oldMemo: string } | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [memoToDelete, setMemoToDelete] = useState<{ accountId: string, memo: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

    const memosByAccount = useMemo(() => {
        const memoMap = new Map<string, { accountName: string; memos: Map<string, number> }>();
        
        journalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                if (!line.memo || !line.accountId) return;

                if (!memoMap.has(line.accountId)) {
                    const account = accounts.find(a => a.id === line.accountId);
                    memoMap.set(line.accountId, {
                        accountName: account ? `${line.accountId} - ${account.name}` : line.accountId,
                        memos: new Map()
                    });
                }
                const accountMemos = memoMap.get(line.accountId)!.memos;
                accountMemos.set(line.memo, (accountMemos.get(line.memo) || 0) + 1);
            });
        });
        
        return Array.from(memoMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [journalEntries, accounts]);

    const filteredMemos = useMemo(() => {
        if (!searchTerm) return memosByAccount;
        const lowerSearch = searchTerm.toLowerCase();

        return memosByAccount
            .map(([accountId, data]) => {
                const filteredMemoEntries = Array.from(data.memos.entries()).filter(([memo, count]) =>
                    memo.toLowerCase().includes(lowerSearch)
                );
                if (data.accountName.toLowerCase().includes(lowerSearch) || filteredMemoEntries.length > 0) {
                     // FIX: Add generic type to `new Map()` constructor to fix type inference error.
                     return [accountId, { ...data, memos: new Map<string, number>(filteredMemoEntries) }];
                }
                return null;
            })
            .filter((item): item is [string, { accountName: string; memos: Map<string, number> }] => item !== null);
    }, [memosByAccount, searchTerm]);

    const handleEdit = (accountId: string, oldMemo: string) => {
        setEditingMemoInfo({ accountId, oldMemo });
        setIsEditModalOpen(true);
    };

    const handleDelete = (accountId: string, memo: string) => {
        setMemoToDelete({ accountId, memo });
        setIsConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (memoToDelete) {
            dispatch({ type: 'UPDATE_MEMOS_BY_ACCOUNT', payload: { accountId: memoToDelete.accountId, oldMemo: memoToDelete.memo, newMemo: '' } });
        }
        setIsConfirmOpen(false);
        setMemoToDelete(null);
    };
    
    const toggleAccount = (accountId: string) => {
        setExpandedAccounts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(accountId)) {
                newSet.delete(accountId);
            } else {
                newSet.add(accountId);
            }
            return newSet;
        });
    };

    return (
        <div className="bg-stone-900 p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center mb-6 gap-4">
                <p className="text-sm text-stone-400">自動彙總日記簿中的摘要，可在此統一編輯。</p>
            </div>

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="搜尋科目或摘要..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-stone-700 rounded-lg bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
            </div>

            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
                {filteredMemos.map(([accountId, data]) => (
                    <div key={accountId} className="border border-stone-700 rounded-lg">
                        <button onClick={() => toggleAccount(accountId)} className="w-full flex justify-between items-center p-3 bg-stone-800 hover:bg-stone-700/80 transition-colors">
                            <span className="font-semibold text-stone-200 text-left">{data.accountName}</span>
                            {expandedAccounts.has(accountId) ? <ChevronDown /> : <ChevronRight />}
                        </button>
                        {expandedAccounts.has(accountId) && (
                            <ul className="p-2">
                                {Array.from(data.memos.entries()).map(([memo, count]) => (
                                    <li key={memo} className="flex justify-between items-center p-2 rounded hover:bg-stone-800/50">
                                        <span className="text-stone-300">{memo} <span className="text-xs text-stone-400">({count}次)</span></span>
                                        <div className="flex space-x-3">
                                            <button onClick={() => handleEdit(accountId, memo)} className="text-stone-400 hover:text-stone-200"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(accountId, memo)} className="text-rose-500 hover:text-rose-400"><Trash2 size={16} /></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </div>

            {isEditModalOpen && editingMemoInfo && (
                <MemoEditForm
                    accountId={editingMemoInfo.accountId}
                    oldMemo={editingMemoInfo.oldMemo}
                    onClose={() => setIsEditModalOpen(false)}
                />
            )}
            {isConfirmOpen && (
                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={confirmDelete}
                    title="確認刪除摘要"
                    message={<span>您確定要刪除摘要 <strong>"{memoToDelete?.memo}"</strong> 嗎？<br/>這將會清除所有相關分錄中的此摘要內容。</span>}
                />
            )}
        </div>
    );
};

export default MemoManagerView;
