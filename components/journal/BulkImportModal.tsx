



import React, { useState } from 'react';
import { JournalEntry, JournalLine } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import Modal from '../ui/Modal';
import { Upload, AlertCircle } from 'lucide-react';

const BulkImportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { state, dispatch } = useAppContext();
    const { accounts, journalEntries } = state;
    const [pastedData, setPastedData] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleImport = () => {
        setIsProcessing(true);
        setError(null);
        setSuccessMessage(null);

        const lines = pastedData.trim().split('\n');
        if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
            setError('貼上的資料是空的。');
            setIsProcessing(false);
            return;
        }

        const journalEntriesMap = new Map<string, JournalEntry>();
        const errors: string[] = [];
        const validAccountIds = new Set(accounts.map(acc => acc.id));

        lines.forEach((line, index) => {
            if (!line.trim()) return; // Skip empty lines
            
            const parts = line.split(',');
            if (parts.length !== 6) {
                errors.push(`第 ${index + 1} 行: 格式不正確，應有 6 個欄位 (以逗號分隔)。`);
                return;
            }

            const [date, id, accountId, memo, debitStr, creditStr] = parts.map(p => p.trim());
            const debit = parseFloat(debitStr);
            const credit = parseFloat(creditStr);

            // Basic validation
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push(`第 ${index + 1} 行: 日期格式錯誤 (應為 YYYY-MM-DD)。`);
            if (!id) errors.push(`第 ${index + 1} 行: 傳票編號不能為空。`);
            if (!validAccountIds.has(accountId)) errors.push(`第 ${index + 1} 行: 會計科目 ID "${accountId}" 不存在。`);
            if (isNaN(debit) || isNaN(credit)) errors.push(`第 ${index + 1} 行: 借方或貸方必須是數字。`);
            if (debit < 0 || credit < 0) errors.push(`第 ${index + 1} 行: 借方或貸方不能為負數。`);
            if (debit > 0 && credit > 0) errors.push(`第 ${index + 1} 行: 借方和貸方不能同時有值。`);

            if (errors.length > 0) return;

            const journalLine: JournalLine = { accountId, memo, debit, credit };

            if (journalEntriesMap.has(id)) {
                journalEntriesMap.get(id)!.lines.push(journalLine);
            } else {
                journalEntriesMap.set(id, { id, date, lines: [journalLine] });
            }
        });

        if (errors.length > 0) {
            setError(errors.join('\n'));
            setIsProcessing(false);
            return;
        }
        
        // Final validation: Debit must equal Credit for each entry
        const finalEntries: JournalEntry[] = [];
        journalEntriesMap.forEach(entry => {
            const totals = entry.lines.reduce((acc, line) => {
                acc.debit += line.debit;
                acc.credit += line.credit;
                return acc;
            }, { debit: 0, credit: 0 });

            if (Math.abs(totals.debit - totals.credit) > 0.001) { // Use a small tolerance for floating point
                errors.push(`傳票 ${entry.id}: 借貸不平衡 (借: ${totals.debit}, 貸: ${totals.credit})。`);
            } else {
                finalEntries.push(entry);
            }
        });

        if (errors.length > 0) {
            setError(errors.join('\n'));
            setIsProcessing(false);
            return;
        }
        
        // Dispatch to context
        if(finalEntries.length > 0) {
            const existingIds = new Set(journalEntries.map(je => je.id));
            const newEntries = finalEntries.filter(e => !existingIds.has(e.id));
            const skippedCount = finalEntries.length - newEntries.length;

            if (newEntries.length > 0) {
               dispatch({ type: 'BULK_ADD_JOURNAL_ENTRIES', payload: newEntries });
            }
            
            setSuccessMessage(`處理完成！成功匯入 ${newEntries.length} 筆新傳票。 (${skippedCount} 筆因ID重複已跳過)`);
            setPastedData('');
        } else {
             setError('沒有可匯入的有效新資料。');
        }
        
        setIsProcessing(false);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="批次貼上分錄資料" size="lg">
            <div className="space-y-4">
                <div>
                    <label className="block mb-2 text-sm font-medium text-stone-200">貼上資料</label>
                    <div className="text-xs text-stone-400 mb-2 p-3 bg-stone-800 rounded-lg">
                        <p>請貼上從 Excel 或其他表格複製的資料。每一行代表一筆分錄明細，欄位之間請用 <strong>半形逗號</strong> 分隔。</p>
                        <p className="font-semibold mt-1">格式: <strong>日期 (YYYY-MM-DD)</strong>,<strong>傳票編號</strong>,<strong>科目ID</strong>,<strong>備註</strong>,<strong>借方金額</strong>,<strong>貸方金額</strong></p>
                    </div>
                    <textarea
                        rows={10}
                        className="bg-stone-950 border border-stone-700 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2.5 placeholder-stone-400 font-mono"
                        placeholder="2024-08-01,20240801-01,6218,午餐,150,0&#10;2024-08-01,20240801-01,1111,君如-錢包,0,150"
                        value={pastedData}
                        onChange={(e) => setPastedData(e.target.value)}
                        disabled={isProcessing}
                    />
                </div>

                {error && (
                    <div className="p-4 text-sm text-red-400 rounded-lg bg-red-900/20" role="alert">
                        <div className="flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span className="font-medium">匯入錯誤！</span>
                        </div>
                        <pre className="mt-2 whitespace-pre-wrap text-xs font-mono bg-stone-900 p-2 rounded">{error}</pre>
                    </div>
                )}
                {successMessage && (
                     <div className="p-4 text-sm text-emerald-400 rounded-lg bg-emerald-900/20" role="alert">
                        {successMessage}
                    </div>
                )}

                <div className="flex justify-end pt-2 space-x-2">
                     <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm font-medium text-stone-200 bg-stone-800 border border-stone-600 rounded-lg hover:bg-stone-700"
                    >
                        關閉
                    </button>
                    <button 
                        onClick={handleImport} 
                        disabled={isProcessing || !pastedData}
                        className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:ring-4 focus:outline-none focus:ring-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Upload size={18} className="mr-2" />
                        {isProcessing ? '處理中...' : '匯入資料'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default BulkImportModal;