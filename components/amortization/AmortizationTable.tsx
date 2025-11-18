import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { AmortizationItem, JournalLine } from '../../types';
import Modal from '../ui/Modal';
import { Plus, Edit, Trash2, FilePlus as JournalIcon, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import JournalEntryForm from '../journal/JournalEntryForm';

const inputClasses = "w-full p-2 border rounded bg-stone-800 border-stone-600 text-white focus:ring-amber-500 focus:border-amber-500";
const btnClasses = {
    primary: "px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700",
    secondary: "px-4 py-2 rounded bg-stone-700 hover:bg-stone-600",
};

const AmortizationForm: React.FC<{ item: AmortizationItem | null, isNew: boolean, onClose: () => void }> = ({ item, isNew, onClose }) => {
    const { state, dispatch } = useAppContext();
    const { accounts } = state;
    const [formData, setFormData] = useState<Omit<AmortizationItem, 'id'>>({
        description: item?.description || '',
        totalAmount: item?.totalAmount || 0,
        periods: item?.periods || 12,
        startDate: item?.startDate || new Date().toLocaleDateString('sv-SE'),
        debitAccountId: item?.debitAccountId || '',
        creditAccountId: item?.creditAccountId || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isNew) {
            dispatch({ type: 'ADD_AMORTIZATION_ITEM', payload: { ...formData, id: Date.now().toString() }});
        } else if (item) {
            dispatch({ type: 'UPDATE_AMORTIZATION_ITEM', payload: { ...formData, id: item.id }});
        }
        onClose();
    };

    const creditAccounts = accounts.filter(a => a.level3.startsWith('142')); // 142-預付款
    const debitAccounts = accounts.filter(a => a.id.startsWith('5') || a.id.startsWith('6'));

    return (
        <Modal isOpen={true} onClose={onClose} title={isNew ? '設定分攤項目' : '編輯分攤項目'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {isNew && <input type="hidden" value={formData.creditAccountId} />}
                <input type="text" placeholder="描述" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClasses} required />
                <input type="number" placeholder="總金額" value={formData.totalAmount || ''} onChange={e => setFormData({...formData, totalAmount: parseFloat(e.target.value)})} className={inputClasses} required />
                <input type="number" placeholder="期數" value={formData.periods || ''} onChange={e => setFormData({...formData, periods: parseInt(e.target.value)})} className={inputClasses} required />
                <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className={inputClasses} required />
                <select value={formData.creditAccountId} onChange={e => setFormData({...formData, creditAccountId: e.target.value})} className={inputClasses} required disabled={!isNew}>
                    <option value="">選擇貸方科目 (預付款)</option>
                    {creditAccounts.map(a => <option key={a.id} value={a.id}>{a.id} - {a.name}</option>)}
                </select>
                 <select value={formData.debitAccountId} onChange={e => setFormData({...formData, debitAccountId: e.target.value})} className={inputClasses} required>
                    <option value="">選擇借方科目 (費用)</option>
                    {debitAccounts.map(a => <option key={a.id} value={a.id}>{a.id} - {a.name}</option>)}
                </select>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className={btnClasses.secondary}>取消</button>
                    <button type="submit" className={btnClasses.primary}>儲存</button>
                </div>
            </form>
        </Modal>
    );
};


const AmortizationTable: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { journalEntries, amortizationItems, accounts } = state;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<AmortizationItem | null>(null);
    const [isEditingNew, setIsEditingNew] = useState(false);
    const [journalModalData, setJournalModalData] = useState<any>(null);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    const reportData = useMemo(() => {
        const allTransactions = journalEntries.flatMap(je => je.lines.map(line => ({ ...line, date: je.date })));
        
        const prepaidAccounts = accounts.filter(a => a.level3.startsWith('142-'));
        const allPrepaidIds = new Set(prepaidAccounts.map(a => a.id));

        const balances = allTransactions.reduce((acc, tx) => {
            acc.set(tx.accountId, (acc.get(tx.accountId) || 0) + tx.debit - tx.credit);
            return acc;
        }, new Map<string, number>());
        
        const txsByAccount = allTransactions.reduce((acc, tx) => {
            if (allPrepaidIds.has(tx.accountId)) {
                if (!acc.has(tx.accountId)) acc.set(tx.accountId, []);
                acc.get(tx.accountId)!.push(tx);
            }
            return acc;
        }, new Map<string, (JournalLine & {date: string})[]>());

        const activePrepaidAccounts = prepaidAccounts.filter(acc => (balances.get(acc.id) || 0) !== 0);

        return activePrepaidAccounts.map(account => {
            const existingItem = amortizationItems.find(item => item.creditAccountId === account.id);
            const accountTransactions = (txsByAccount.get(account.id) || []).sort((a,b) => a.date.localeCompare(b.date));
            
            if (existingItem) {
                return {
                    ...existingItem,
                    isSynthesized: false,
                    remainingBalance: balances.get(account.id) || 0,
                    details: accountTransactions,
                };
            } else {
                const firstDebitTx = accountTransactions.find(tx => tx.debit > 0);
                return {
                    id: `syn_${account.id}`,
                    description: firstDebitTx?.memo || `${account.name} (待設定)`,
                    totalAmount: firstDebitTx?.debit || balances.get(account.id) || 0,
                    periods: 12, // default
                    startDate: firstDebitTx?.date || new Date().toLocaleDateString('sv-SE'),
                    debitAccountId: '',
                    creditAccountId: account.id,
                    isSynthesized: true,
                    remainingBalance: balances.get(account.id) || 0,
                    details: accountTransactions,
                };
            }
        });

    }, [amortizationItems, journalEntries, accounts]);

    const handleAdd = () => {
        setEditingItem(null);
        setIsEditingNew(true);
        setIsModalOpen(true);
    };
    
    const handleEdit = (item: any) => {
        setEditingItem(item);
        setIsEditingNew(item.isSynthesized);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('確定要刪除此分攤項目?')) {
            dispatch({ type: 'DELETE_AMORTIZATION_ITEM', payload: id });
        }
    };
    
    const handleCreateJournalEntry = (item: any) => {
        if(item.isSynthesized || !item.debitAccountId) {
            alert("請先設定此分攤項目的費用科目。");
            return;
        }
        const monthlyAmount = Math.round((item.totalAmount / item.periods) * 100) / 100;
        const today = new Date().toLocaleDateString('sv-SE');
        setJournalModalData({
            date: today,
            lines: [
                { accountId: item.debitAccountId, memo: `${item.description} (分攤)`, debit: monthlyAmount, credit: 0},
                { accountId: item.creditAccountId, memo: `${item.description} (分攤)`, debit: 0, credit: monthlyAmount},
            ]
        });
    }
    
    const toggleExpand = (itemId: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) newSet.delete(itemId);
            else newSet.add(itemId);
            return newSet;
        });
    };

    return (
        <div className="bg-stone-900 p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center mb-6 gap-4">
                <button onClick={handleAdd} className="flex items-center bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors duration-200 shadow">
                    <Plus size={20} className="mr-2" /> 手動新增
                </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-stone-700">
                <table className="w-full text-sm text-left text-stone-400">
                    <thead className="text-xs text-stone-300 uppercase bg-stone-800">
                        <tr>
                            <th className="px-6 py-3">描述</th>
                            <th className="px-6 py-3 text-right">總金額</th>
                            <th className="px-6 py-3 text-right hidden sm:table-cell">期數</th>
                            <th className="px-6 py-3 text-right">每期金額</th>
                            <th className="px-6 py-3 text-right">剩餘金額</th>
                            <th className="px-6 py-3 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                    {reportData.map(item => {
                        const monthlyAmount = item.periods > 0 ? item.totalAmount / item.periods : 0;
                        const isExpanded = expandedItems.has(item.id);
                        return (
                        <React.Fragment key={item.id}>
                            <tr className={`border-b border-stone-700 hover:bg-stone-800 cursor-pointer ${item.isSynthesized ? 'bg-amber-900/20' : 'bg-stone-900'}`} onClick={() => toggleExpand(item.id)}>
                                <td className="px-6 py-4 font-medium text-white flex items-center">
                                    {isExpanded ? <ChevronDown size={16} className="mr-2" /> : <ChevronRight size={16} className="mr-2" />}
                                    {item.description}
                                    {item.isSynthesized && <span className="ml-2 text-xs text-amber-400 bg-amber-900/50 px-2 py-0.5 rounded-full">待設定</span>}
                                </td>
                                <td className="px-6 py-4 text-right font-mono">{item.totalAmount.toLocaleString()}</td>
                                <td className="px-6 py-4 text-right hidden sm:table-cell font-mono">{item.periods}</td>
                                <td className="px-6 py-4 text-right font-mono">{monthlyAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                <td className="px-6 py-4 text-right font-mono font-bold text-sky-400">{item.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td className="px-6 py-4 flex justify-center space-x-2" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => handleCreateJournalEntry(item)} className="text-emerald-500 hover:text-emerald-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="產生分錄" disabled={item.isSynthesized}><JournalIcon size={18} /></button>
                                    <button onClick={() => handleEdit(item)} className="text-stone-400 hover:text-stone-200 transition-colors" title={item.isSynthesized ? "設定" : "編輯"}>{item.isSynthesized ? <Plus size={18} /> :<Edit size={18} />}</button>
                                    {!item.isSynthesized && <button onClick={() => handleDelete(item.id)} className="text-rose-500 hover:text-rose-400 transition-colors" title="刪除"><Trash2 size={18} /></button>}
                                </td>
                            </tr>
                            {isExpanded && item.details.length > 0 && (
                                <tr className="bg-stone-950">
                                    <td colSpan={6} className="p-2">
                                        <div className="p-2 bg-stone-900 rounded-md">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-stone-700">
                                                        <th className="p-2 text-left font-medium">日期</th>
                                                        <th className="p-2 text-left font-medium">摘要</th>
                                                        <th className="p-2 text-right font-medium">借方 (支出)</th>
                                                        <th className="p-2 text-right font-medium">貸方 (沖銷)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                {item.details.map((detail, index) => (
                                                    <tr key={index} className="border-b border-stone-700 last:border-0">
                                                        <td className="p-2">{detail.date}</td>
                                                        <td className="p-2">{detail.memo}</td>
                                                        <td className="p-2 text-right font-mono text-emerald-500">{detail.debit > 0 ? detail.debit.toLocaleString() : ''}</td>
                                                        <td className="p-2 text-right font-mono text-rose-500">{detail.credit > 0 ? detail.credit.toLocaleString() : ''}</td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                        )
                    })}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <AmortizationForm item={editingItem} isNew={isEditingNew} onClose={() => setIsModalOpen(false)} />}
            {journalModalData && <JournalEntryForm initialData={journalModalData} onClose={() => setJournalModalData(null)} />}
        </div>
    );
};

export default AmortizationTable;
