import React, { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { CreditCardLedger, CreditCardTransaction } from '../../types';
import Modal from '../ui/Modal';
import { Plus, Edit, Trash2, FilePlus as JournalIcon, Upload } from 'lucide-react';
import JournalEntryForm from '../journal/JournalEntryForm';
import CreditCardBulkImportModal from './CreditCardBulkImportModal';
import ConfirmationModal from '../ui/ConfirmationModal';

const inputClasses = "w-full p-2 border rounded bg-stone-800 border-stone-600 text-white focus:ring-amber-500 focus:border-amber-500";
const btnClasses = {
    primary: "px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700",
    secondary: "px-4 py-2 rounded bg-stone-700 hover:bg-stone-600",
};


const LedgerForm: React.FC<{ ledger: CreditCardLedger | null, onClose: () => void }> = ({ ledger, onClose }) => {
    const { state, dispatch } = useAppContext();
    const liabilityAccounts = state.accounts.filter(a => a.id.startsWith('241'));
    const [name, setName] = useState(ledger?.name || '');
    const [liabilityAccountId, setLiabilityAccountId] = useState(ledger?.liabilityAccountId || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            id: ledger?.id || Date.now().toString(),
            name,
            liabilityAccountId,
            transactions: ledger?.transactions || []
        };
        if (ledger) {
            // FIX: Corrected a typo in the dispatch action type. 'UPDATE_CRED-IT_CARD_LEDGER' should be 'UPDATE_CREDIT_CARD_LEDGER'.
            dispatch({ type: 'UPDATE_CREDIT_CARD_LEDGER', payload });
        } else {
            dispatch({ type: 'ADD_CREDIT_CARD_LEDGER', payload });
        }
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={ledger ? '編輯信用卡帳本' : '新增信用卡帳本'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="帳本名稱" value={name} onChange={e => setName(e.target.value)} className={inputClasses} required />
                <select value={liabilityAccountId} onChange={e => setLiabilityAccountId(e.target.value)} className={inputClasses} required>
                    <option value="">選擇對應的負債科目</option>
                    {liabilityAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.id} - {acc.name}</option>)}
                </select>
                <div className="flex justify-end space-x-2 pt-4">
                    <button type="button" onClick={onClose} className={btnClasses.secondary}>取消</button>
                    <button type="submit" className={btnClasses.primary}>儲存</button>
                </div>
            </form>
        </Modal>
    );
};

const CreditCardLedgerView: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { creditCardLedgers, accounts } = state;
    const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(creditCardLedgers[0]?.id || null);
    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
    const [editingLedger, setEditingLedger] = useState<CreditCardLedger | null>(null);
    const [journalModalData, setJournalModalData] = useState<any>(null);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [ledgerToDelete, setLedgerToDelete] = useState<string | null>(null);

    const selectedLedger = creditCardLedgers.find(l => l.id === selectedLedgerId);

    const handleAddLedger = () => {
        setEditingLedger(null);
        setIsLedgerModalOpen(true);
    };

    const handleEditLedger = (ledger: CreditCardLedger) => {
        setEditingLedger(ledger);
        setIsLedgerModalOpen(true);
    };

    const handleDeleteLedger = (id: string) => {
        setLedgerToDelete(id);
        setIsConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (ledgerToDelete) {
            dispatch({ type: 'DELETE_CREDIT_CARD_LEDGER', payload: ledgerToDelete });
            if (selectedLedgerId === ledgerToDelete) {
                const remainingLedgers = creditCardLedgers.filter(l => l.id !== ledgerToDelete);
                setSelectedLedgerId(remainingLedgers.length > 0 ? remainingLedgers[0].id : null);
            }
        }
        setIsConfirmOpen(false);
        setLedgerToDelete(null);
    };

    const handleTransactionChange = (txId: string, field: keyof CreditCardTransaction, value: string | number) => {
        if (!selectedLedger) return;
        const updatedTransactions = selectedLedger.transactions.map(tx => tx.id === txId ? {...tx, [field]: value} : tx);
        dispatch({type: 'UPDATE_CREDIT_CARD_LEDGER', payload: {...selectedLedger, transactions: updatedTransactions}});
    };

    const handleAddTransaction = () => {
        if (!selectedLedger) return;
        const newTx: CreditCardTransaction = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString('sv-SE'),
            description: '',
            amount: 0
        };
        const updatedTransactions = [newTx, ...selectedLedger.transactions];
        dispatch({type: 'UPDATE_CREDIT_CARD_LEDGER', payload: {...selectedLedger, transactions: updatedTransactions}});
    };

    const handleDeleteTransaction = (txId: string) => {
        if (!selectedLedger) return;
        const updatedTransactions = selectedLedger.transactions.filter(tx => tx.id !== txId);
        dispatch({type: 'UPDATE_CREDIT_CARD_LEDGER', payload: {...selectedLedger, transactions: updatedTransactions}});
    };
    
    const handleGenerateJournalEntry = () => {
        if (!selectedLedger || selectedLedger.transactions.length === 0) return;

        const totalAmount = selectedLedger.transactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        if (totalAmount <= 0) {
            alert("沒有可產生分錄的交易。");
            return;
        }

        const debitLines = selectedLedger.transactions
            .filter(tx => (Number(tx.amount) || 0) > 0 && tx.accountId)
            .map(tx => ({
                accountId: tx.accountId!,
                memo: tx.description,
                debit: tx.amount,
                credit: 0
            }));

        if (debitLines.length === 0) {
            alert("請為交易選擇費用科目以產生分錄。");
            return;
        }

        const journalDate = new Date().toLocaleDateString('sv-SE');
        setJournalModalData({
            date: journalDate,
            lines: [
                ...debitLines,
                { accountId: selectedLedger.liabilityAccountId, memo: `${selectedLedger.name} 帳單`, debit: 0, credit: totalAmount }
            ]
        });
        
        dispatch({ type: 'UPDATE_CREDIT_CARD_LEDGER', payload: {...selectedLedger, transactions: []}});
    };

    const expenseAccounts = accounts.filter(a => a.id.startsWith('5') || a.id.startsWith('6') || a.id.startsWith('7'));

    return (
        <div className="bg-stone-900 p-4 sm:p-6 rounded-xl shadow-lg h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                    <select value={selectedLedgerId || ''} onChange={e => setSelectedLedgerId(e.target.value)} className="p-2 border rounded bg-stone-800 border-stone-600">
                        <option value="">選擇帳本</option>
                        {creditCardLedgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                    <button onClick={handleAddLedger} className="p-2 rounded bg-amber-700 hover:bg-amber-800 text-white shadow"><Plus size={20} /></button>
                </div>
            </div>

            {selectedLedger ? (
                <div className="flex-grow flex flex-col min-h-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                        <div className="flex items-center gap-2 text-stone-500">
                          <button onClick={() => handleEditLedger(selectedLedger)} className="hover:text-stone-300 transition-colors"><Edit size={18} /></button>
                          <button onClick={() => handleDeleteLedger(selectedLedger.id)} className="text-stone-400 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                            <button onClick={() => setIsBulkImportOpen(true)} className="flex items-center bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors shadow justify-center">
                                <Upload size={20} className="mr-2"/> 快速寫入
                            </button>
                            <button onClick={handleGenerateJournalEntry} className="flex items-center bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow justify-center">
                               <JournalIcon size={20} className="mr-2"/> 一鍵產出分錄
                            </button>
                        </div>
                    </div>

                    <div className="overflow-auto flex-grow border border-stone-700 rounded-lg">
                        <table className="w-full text-sm">
                             <thead className="sticky top-0 bg-stone-800 z-10">
                                <tr className="border-b border-stone-700">
                                    <th className="p-2 text-left font-medium text-stone-300 min-w-[120px]">日期</th>
                                    <th className="p-2 text-left font-medium text-stone-300 min-w-[150px]">描述</th>
                                    <th className="p-2 text-left font-medium text-stone-300 min-w-[180px]">費用科目</th>
                                    <th className="p-2 text-right font-medium text-stone-300 min-w-[100px]">金額</th>
                                    <th className="p-2 text-center font-medium text-stone-300">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-700">
                                {selectedLedger.transactions.map(tx => (
                                    <tr key={tx.id} className="hover:bg-stone-800/50">
                                        <td className="p-1"><input type="date" value={tx.date} onChange={e => handleTransactionChange(tx.id, 'date', e.target.value)} className="w-full p-1 bg-transparent rounded focus:bg-stone-700 outline-none" /></td>
                                        <td className="p-1"><input type="text" value={tx.description} onChange={e => handleTransactionChange(tx.id, 'description', e.target.value)} className="w-full p-1 bg-transparent rounded focus:bg-stone-700 outline-none" /></td>
                                        <td className="p-1">
                                            <select value={tx.accountId || ''} onChange={e => handleTransactionChange(tx.id, 'accountId', e.target.value)} className="w-full p-1 bg-transparent border-0 rounded focus:bg-stone-700 outline-none">
                                                <option value="">選擇</option>
                                                {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.id}-{a.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="p-1"><input type="number" value={tx.amount || ''} onChange={e => handleTransactionChange(tx.id, 'amount', parseFloat(e.target.value) || 0)} className="w-full p-1 bg-transparent text-right rounded focus:bg-stone-700 outline-none font-mono" /></td>
                                        <td className="text-center p-1"><button onClick={() => handleDeleteTransaction(tx.id)} className="text-stone-400 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <button onClick={handleAddTransaction} className="mt-4 w-full flex items-center justify-center p-2 rounded-lg bg-stone-800 hover:bg-stone-700 transition-colors text-stone-300">
                        <Plus size={16} className="mr-2" /> 新增交易
                    </button>
                </div>
            ) : (
                <div className="text-center text-stone-500 py-16 flex-grow flex flex-col justify-center items-center">
                    <p>請選擇或新增一個信用卡帳本</p>
                </div>
            )}
            
            {isLedgerModalOpen && <LedgerForm ledger={editingLedger} onClose={() => setIsLedgerModalOpen(false)} />}
            {journalModalData && <JournalEntryForm initialData={journalModalData} onClose={() => setJournalModalData(null)} />}
            {isBulkImportOpen && selectedLedger && <CreditCardBulkImportModal ledger={selectedLedger} onClose={() => setIsBulkImportOpen(false)} />}
            {isConfirmOpen && (
                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={confirmDelete}
                    title="確認刪除帳本"
                    message="您確定要刪除這個信用卡帳本嗎？此操作無法復原。"
                />
            )}
        </div>
    );
};

export default CreditCardLedgerView;