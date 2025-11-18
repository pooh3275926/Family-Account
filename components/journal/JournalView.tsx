import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { JournalEntry } from '../../types';
import JournalEntryForm from './JournalEntryForm';
import { Plus, ClipboardPaste, Edit, Trash2, Search, Copy, User } from 'lucide-react';
import BulkImportModal from './BulkImportModal';
import ConfirmationModal from '../ui/ConfirmationModal';

const JournalView: React.FC = () => {
    const { data, dispatch } = useData();
    const { accounts, journalEntries } = data;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
    const [entryToCopy, setEntryToCopy] = useState<JournalEntry | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const today = new Date().toLocaleDateString('sv-SE');

    const getAccountName = (id: string) => accounts.find(acc => acc.id === id)?.name || '未知科目';
    
    const handleAddNew = () => {
        setEditingEntry(null);
        setEntryToCopy(null);
        setIsModalOpen(true);
    };

    const handleEdit = (entry: JournalEntry) => {
        setEditingEntry(entry);
        setEntryToCopy(null);
        setIsModalOpen(true);
    };

    const handleCopy = (entry: JournalEntry) => {
        setEditingEntry(null);
        setEntryToCopy(entry);
        setIsModalOpen(true);
    }

    const handleDelete = (id: string) => {
        setEntryToDelete(id);
        setIsConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (entryToDelete) {
            dispatch({ type: 'DELETE_JOURNAL_ENTRY', payload: entryToDelete });
        }
        setIsConfirmOpen(false);
        setEntryToDelete(null);
    };

    const filteredEntries = useMemo(() => {
        if (!searchTerm) return journalEntries;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return journalEntries.filter(entry => {
            return (
                entry.id.includes(searchTerm) ||
                entry.date.includes(searchTerm) ||
                (entry.createdBy && entry.createdBy.toLowerCase().includes(lowerCaseSearch)) ||
                (entry.lastModifiedBy && entry.lastModifiedBy.toLowerCase().includes(lowerCaseSearch)) ||
                entry.lines.some(line => 
                    line.memo.toLowerCase().includes(lowerCaseSearch) ||
                    line.accountId.includes(searchTerm) ||
                    getAccountName(line.accountId).toLowerCase().includes(lowerCaseSearch)
                )
            );
        });
    }, [journalEntries, searchTerm, accounts]);
    
    const UserStamp = ({ user }: { user?: string }) => user ? (
        <span className="flex items-center text-xs text-stone-500" title={user}>
            <User size={12} className="mr-1" /> {user}
        </span>
    ) : null;

    return (
        <div className="bg-stone-900 p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center mb-6 gap-4">
                <div className="flex flex-wrap gap-2">
                     <button onClick={handleAddNew} className="flex items-center bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors duration-200 shadow">
                        <Plus size={20} className="mr-2" /> 新增分錄
                    </button>
                    <button onClick={() => setIsImportModalOpen(true)} className="flex items-center bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors duration-200 shadow">
                        <ClipboardPaste size={20} className="mr-2" /> 批次匯入
                    </button>
                </div>
            </div>
            
            <div className="mb-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search size={20} className="text-stone-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="搜尋傳票日期, 編號, 科目, 摘要, 建立者..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-stone-700 rounded-lg bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                </div>
            </div>

            <div className="overflow-y-auto max-h-[65vh] space-y-4 pr-2">
                {filteredEntries.length === 0 ? <p className="text-center text-stone-400 py-8">{journalEntries.length === 0 ? "沒有任何分錄" : "找不到符合條件的分錄"}</p> : 
                    filteredEntries.map(entry => (
                        <div key={entry.id} className="border border-stone-700 rounded-lg shadow-sm overflow-hidden bg-stone-800/50">
                            <div className="bg-stone-800 px-4 py-2 flex justify-between items-center border-b border-stone-700">
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold text-stone-200">{entry.date}</span>
                                    <span className="text-sm text-stone-400">傳票編號: {entry.id}</span>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <button onClick={() => handleCopy(entry)} className="text-sky-500 hover:text-sky-400 transition-colors" aria-label="複製傳票"><Copy size={16} /></button>
                                    <button onClick={() => handleEdit(entry)} className="text-stone-400 hover:text-stone-200 transition-colors" aria-label="編輯傳票"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(entry.id)} className="text-rose-500 hover:text-rose-400 transition-colors" aria-label="刪除傳票"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left table-fixed">
                                    <thead className="hidden">
                                        <tr>
                                            <th className="w-[30%]">科目</th>
                                            <th className="w-[40%]">備註</th>
                                            <th className="w-[15%]">借方</th>
                                            <th className="w-[15%]">貸方</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-stone-300 align-top">
                                        {entry.lines.map((line, index) => (
                                            <tr key={index} className="border-b border-stone-700 last:border-b-0">
                                                <td className="px-4 py-2 break-words w-[30%]">{line.accountId} - {getAccountName(line.accountId)}</td>
                                                <td className="px-4 py-2 break-words w-[40%]">{line.memo}</td>
                                                <td className="px-4 py-2 text-right font-mono w-[15%]">{line.debit ? line.debit.toLocaleString() : ''}</td>
                                                <td className="px-4 py-2 text-right font-mono w-[15%]">{line.credit ? line.credit.toLocaleString() : ''}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                             <div className="bg-stone-800/50 px-4 py-1 flex justify-end items-center gap-4 border-t border-stone-700">
                                {entry.lastModifiedBy && <span className="italic text-xs text-stone-500">修改: {entry.lastModifiedBy}</span>}
                                {entry.createdBy && <span className="italic text-xs text-stone-500">建立: {entry.createdBy}</span>}
                            </div>
                        </div>
                    ))
                }
            </div>

            {isModalOpen && (
                <JournalEntryForm
                    entryToEdit={editingEntry}
                    initialData={entryToCopy ? { date: today, lines: entryToCopy.lines } : undefined}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingEntry(null);
                        setEntryToCopy(null);
                    }}
                />
            )}
             {isImportModalOpen && (
                <BulkImportModal onClose={() => setIsImportModalOpen(false)} />
            )}
            {isConfirmOpen && (
                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={confirmDelete}
                    title="確認刪除傳票"
                    message="您確定要刪除這筆傳票嗎？此操作無法復原。"
                />
            )}
        </div>
    );
};

export default JournalView;