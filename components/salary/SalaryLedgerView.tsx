import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { JournalLine, SalaryLedgerLine } from '../../types';
import JournalEntryForm from '../journal/JournalEntryForm';
import { Plus, Trash2, FilePlus as JournalIcon, RefreshCw, AlertCircle } from 'lucide-react';

const SalaryLedgerView: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { accounts, salaryLedger, journalEntries } = state;
    const [amounts, setAmounts] = useState<Record<number, { debit: number; credit: number }>>({});
    const [journalModalData, setJournalModalData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const getAccountName = (id: string) => accounts.find(acc => acc.id === id)?.name || '未知科目';
    
    const sortedAccounts = useMemo(() => [...accounts].sort((a,b) => a.id.localeCompare(b.id)), [accounts]);

    const handleLineChange = (index: number, field: keyof SalaryLedgerLine, value: string) => {
        const newLedger = [...salaryLedger];
        newLedger[index] = { ...newLedger[index], [field]: value };
        dispatch({ type: 'UPDATE_SALARY_LEDGER', payload: newLedger });
    };
    
    const addLine = () => {
        const newLedger = [...salaryLedger, { accountId: '', memo: '' }];
        dispatch({ type: 'UPDATE_SALARY_LEDGER', payload: newLedger });
    };

    const removeLine = (index: number) => {
        const newLedger = salaryLedger.filter((_, i) => i !== index);
        dispatch({ type: 'UPDATE_SALARY_LEDGER', payload: newLedger });
    };
    
    const handleAmountChange = (index: number, type: 'debit' | 'credit', value: string) => {
        const numValue = parseFloat(value) || 0;
        setAmounts(prev => ({
            ...prev,
            [index]: {
                debit: type === 'debit' ? numValue : 0,
                credit: type === 'credit' ? numValue : 0
            }
        }));
    };
    
    const totals = useMemo(() => {
        return Object.values(amounts).reduce((acc, curr: { debit: number; credit: number }) => {
            acc.debit += curr.debit;
            acc.credit += curr.credit;
            return acc;
        }, { debit: 0, credit: 0 });
    }, [amounts]);
    
    const handleGenerateJournalEntry = () => {
        setError(null);
        const lines: Partial<JournalLine>[] = [];
        
        salaryLedger.forEach((line, index) => {
            const amount = amounts[index];
            if (amount && (amount.debit > 0 || amount.credit > 0)) {
                lines.push({
                    accountId: line.accountId,
                    memo: line.memo,
                    debit: amount.debit,
                    credit: amount.credit
                });
            }
        });

        if (lines.length === 0) {
            setError("請至少填寫一筆金額。");
            return;
        }

        if (Math.abs(totals.debit - totals.credit) > 0.001) {
            setError("借貸方金額不平衡。");
            return;
        }
        
        const journalDate = new Date().toLocaleDateString('sv-SE');
        setJournalModalData({
            date: journalDate,
            lines: lines
        });
        setAmounts({}); // Clear amounts after generating
    };
    
    const handleReset = () => {
        dispatch({ type: 'RESET_SALARY_LEDGER' });
    };
    
    const inputClasses = "w-full p-1 bg-transparent rounded focus:bg-stone-700 outline-none";

    return (
        <div className="bg-stone-900 p-4 sm:p-6 rounded-xl shadow-lg h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center mb-6 gap-4">
                 <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                    <button onClick={handleReset} className="flex items-center bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors shadow justify-center">
                        <RefreshCw size={18} className="mr-2"/> 重設為預設
                    </button>
                    <button onClick={handleGenerateJournalEntry} className="flex items-center bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow justify-center">
                       <JournalIcon size={20} className="mr-2"/> 產生分錄
                    </button>
                </div>
            </div>
            
            {error && 
                <div className="mb-4 flex items-center text-red-400 text-sm p-3 bg-red-900/20 rounded-lg">
                    <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                    {error}
                </div>
            }

            <div className="overflow-auto flex-grow border border-stone-700 rounded-lg">
                <table className="w-full text-sm">
                     <thead className="sticky top-0 bg-stone-800 z-10">
                        <tr className="border-b border-stone-700">
                            <th className="p-2 text-left font-medium text-stone-300 w-2/5 min-w-[200px]">科目</th>
                            <th className="p-2 text-left font-medium text-stone-300 w-2/5 min-w-[200px]">備註</th>
                            <th className="p-2 text-right font-medium text-stone-300 min-w-[100px]">借方金額</th>
                            <th className="p-2 text-right font-medium text-stone-300 min-w-[100px]">貸方金額</th>
                            <th className="p-2 text-center font-medium text-stone-300"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-700">
                        {salaryLedger.map((line, index) => (
                            <tr key={index} className="hover:bg-stone-800/50">
                                <td className="p-1">
                                    <select value={line.accountId} onChange={e => handleLineChange(index, 'accountId', e.target.value)} className={inputClasses}>
                                        <option value="">選擇科目</option>
                                        {sortedAccounts.map(a => <option key={a.id} value={a.id}>{a.id}-{a.name}</option>)}
                                    </select>
                                </td>
                                <td className="p-1">
                                    <input type="text" value={line.memo} onChange={e => handleLineChange(index, 'memo', e.target.value)} className={inputClasses} />
                                </td>
                                <td className="p-1">
                                    <input type="number" placeholder="借方" value={amounts[index]?.debit || ''} onChange={(e) => handleAmountChange(index, 'debit', e.target.value)} className={`${inputClasses} text-right font-mono`} />
                                </td>
                                <td className="p-1">
                                    <input type="number" placeholder="貸方" value={amounts[index]?.credit || ''} onChange={(e) => handleAmountChange(index, 'credit', e.target.value)} className={`${inputClasses} text-right font-mono`} />
                                </td>
                                <td className="text-center p-1">
                                    <button onClick={() => removeLine(index)} className="text-stone-400 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-stone-700 bg-stone-800/50">
                            <td colSpan={2} className="p-2 text-right font-semibold">總計</td>
                            <td className={`p-2 text-right font-mono font-bold ${totals.debit !== totals.credit ? 'text-rose-500' : ''}`}>{totals.debit.toLocaleString()}</td>
                            <td className={`p-2 text-right font-mono font-bold ${totals.debit !== totals.credit ? 'text-rose-500' : ''}`}>{totals.credit.toLocaleString()}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
             <button onClick={addLine} className="mt-4 w-full flex items-center justify-center p-2 rounded-lg bg-stone-800 hover:bg-stone-700 transition-colors text-stone-300">
                <Plus size={16} className="mr-2" /> 新增一行
            </button>
            
            {journalModalData && <JournalEntryForm initialData={journalModalData} onClose={() => setJournalModalData(null)} />}
        </div>
    );
};

export default SalaryLedgerView;
