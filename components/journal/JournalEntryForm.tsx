import React, { useState, useMemo, useEffect } from 'react';
import { JournalEntry, JournalLine } from '../../types';
import { useData } from '../../contexts/DataContext';
import Modal from '../ui/Modal';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

interface JournalEntryFormProps {
    onClose: () => void;
    entryToEdit?: JournalEntry | null;
    initialData?: { date: string; lines: Partial<JournalLine>[] };
}

const JournalEntryForm: React.FC<JournalEntryFormProps> = ({ onClose, entryToEdit, initialData }) => {
    const { data, dispatch, activeProfile } = useData();
    const { accounts, journalEntries, managedMemos } = data;
    const today = new Date().toLocaleDateString('sv-SE');
    const isEditMode = !!entryToEdit;

    const [mode, setMode] = useState<'form' | 'text'>('form');
    
    const [date, setDate] = useState(entryToEdit?.date || initialData?.date || today);
    const [lines, setLines] = useState<Partial<JournalLine>[]>(
        entryToEdit?.lines || initialData?.lines || [
            { accountId: '', memo: '', debit: 0, credit: 0 },
            { accountId: '', memo: '', debit: 0, credit: 0 },
        ]
    );
    const [error, setError] = useState('');

    const [textInput, setTextInput] = useState('');
    const [parsedLines, setParsedLines] = useState<(Partial<JournalLine> & { raw: string; error?: string })[]>([]);

    const memoSuggestions = useMemo(() => {
        const frequencies = new Map<string, Map<string, number>>();
        journalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                if (!line.accountId || !line.memo) return;

                if (!frequencies.has(line.accountId)) {
                    frequencies.set(line.accountId, new Map());
                }
                const accountMemos = frequencies.get(line.accountId)!;
                accountMemos.set(line.memo, (accountMemos.get(line.memo) || 0) + 1);
            });
        });

        const suggestions = new Map<string, string>();
        frequencies.forEach((memoMap, accountId) => {
            let bestMemo = '';
            let maxCount = 0;
            memoMap.forEach((count, memo) => {
                if (count > maxCount) {
                    maxCount = count;
                    bestMemo = memo;
                }
            });
            if (bestMemo) {
                suggestions.set(accountId, bestMemo);
            }
        });
        return suggestions;
    }, [journalEntries]);

    const handleLineChange = (index: number, field: keyof JournalLine, value: string | number) => {
        const newLines = [...lines];
        const line = { ...newLines[index] };
        
        if (field === 'accountId') {
            const newAccountId = value as string;
            line.accountId = newAccountId;
            
            if (!line.memo && newAccountId) {
                const suggestion = memoSuggestions.get(newAccountId);
                if (suggestion) {
                    line.memo = suggestion;
                }
            }
        } else if (field === 'memo') {
            line.memo = value as string;
        } else if (field === 'debit' || field === 'credit') {
            const numValue = Number(value) || 0;
            if (field === 'debit' && numValue > 0) {
                line.debit = numValue;
                line.credit = 0;
            } else if (field === 'credit' && numValue > 0) {
                line.credit = numValue;
                line.debit = 0;
            } else {
                 line[field] = numValue;
            }
        }
        
        newLines[index] = line;
        setLines(newLines);
    };
    
    const addLine = () => {
        setLines([...lines, { accountId: '', memo: '', debit: 0, credit: 0 }]);
    };
    
    const removeLine = (index: number) => {
        if (lines.length > 1) {
            const newLines = lines.filter((_, i) => i !== index);
            setLines(newLines);
        }
    };
    
    const totals = useMemo(() => {
        return lines.reduce(
            (acc: { debit: number; credit: number }, line) => {
                acc.debit += line.debit || 0;
                acc.credit += line.credit || 0;
                return acc;
            },
            { debit: 0, credit: 0 }
        );
    }, [lines]);
    
    useEffect(() => {
        if (mode !== 'text') return;
        
        const linesFromText = textInput.trim().split('\n');
        const newParsedLines = linesFromText.map(lineStr => {
            if (!lineStr.trim()) return null;

            const parts = lineStr.split(',');
            if (parts.length !== 4) {
                return { raw: lineStr, error: '格式錯誤: 應有 4 個欄位 (科目ID,摘要,借方,貸方)。' };
            }

            const [accountId, memo, debitStr, creditStr] = parts.map(p => p.trim());
            
            if (!accounts.some(a => a.id === accountId)) {
                return { raw: lineStr, accountId, memo, debit: 0, credit: 0, error: `科目 ID "${accountId}" 不存在。` };
            }

            const debit = parseFloat(debitStr);
            const credit = parseFloat(creditStr);

            if (isNaN(debit) || isNaN(credit)) {
                return { raw: lineStr, accountId, memo, debit: 0, credit: 0, error: '借方或貸方必須是有效的數字。' };
            }
            if (debit > 0 && credit > 0) {
                return { raw: lineStr, accountId, memo, debit, credit, error: '借方和貸方不能同時有值。' };
            }

            return { raw: lineStr, accountId, memo, debit, credit, error: undefined };
        }).filter((l): l is NonNullable<typeof l> => l !== null);

        setParsedLines(newParsedLines);
    }, [textInput, accounts, mode]);

    const textTotals = useMemo(() => {
        return parsedLines.reduce(
            (acc: { debit: number; credit: number }, line) => {
                if (!line.error) {
                    acc.debit += line.debit || 0;
                    acc.credit += line.credit || 0;
                }
                return acc;
            },
            { debit: 0, credit: 0 }
        );
    }, [parsedLines]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        let finalLines: JournalLine[];
        let finalTotals: { debit: number; credit: number };

        if (mode === 'text' && !isEditMode) {
            if (parsedLines.some(line => line.error)) {
                setError('文字輸入內容有錯誤，請修正後再提交。');
                return;
            }
            finalLines = parsedLines.filter(line => !line.error && line.accountId && (line.debit || line.credit)) as JournalLine[];
            finalTotals = textTotals;
        } else {
            finalLines = lines.filter(line => line.accountId && (line.debit || line.credit)) as JournalLine[];
            finalTotals = totals;
        }

        if (finalLines.length < 2) {
            setError('至少需要兩行分錄。');
            return;
        }
        
        if (Math.abs(finalTotals.debit - finalTotals.credit) > 0.001) {
            setError('借方總額與貸方總額必須相等。');
            return;
        }
        
        if (finalTotals.debit === 0) {
            setError('總金額不能為零。');
            return;
        }

        const userName = activeProfile?.name;

        if (isEditMode) {
             dispatch({
                type: 'UPDATE_JOURNAL_ENTRY',
                payload: {
                    ...entryToEdit,
                    date,
                    lines: finalLines,
                    lastModifiedBy: userName
                },
            });
        } else {
            const dayEntries = journalEntries.filter(entry => entry.date === date);
            let maxIdNum = 0;
            dayEntries.forEach(entry => {
                const idParts = entry.id.split('-');
                const lastPart = idParts[idParts.length - 1];
                if (lastPart) {
                    const numericPart = parseInt(lastPart.replace(/\D/g, ''), 10);
                    if (!isNaN(numericPart) && numericPart > maxIdNum) {
                        maxIdNum = numericPart;
                    }
                }
            });
            const voucherId = `${date.replace(/-/g, '')}-${(maxIdNum + 1).toString().padStart(2, '0')}`;

            dispatch({
                type: 'ADD_JOURNAL_ENTRY',
                payload: {
                    id: voucherId,
                    date,
                    lines: finalLines,
                    createdBy: userName
                },
            });
        }
        
        onClose();
    };
    
    const sortedAccounts = useMemo(() => [...accounts].sort((a,b) => a.id.localeCompare(b.id)), [accounts]);
    const inputClasses = "bg-stone-800 border border-stone-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2.5 placeholder-stone-400";
    const tabClasses = (isActive: boolean) => `px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${isActive ? 'border-b-2 border-amber-500 text-stone-100' : 'text-stone-400 hover:text-stone-200'}`;

    const renderFormInput = () => (
        <>
            <div className="space-y-2 overflow-x-auto">
                <div className="min-w-[600px]">
                {lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center mb-2">
                        <select
                            value={line.accountId}
                            onChange={(e) => handleLineChange(index, 'accountId', e.target.value)}
                            className={`${inputClasses} col-span-4`}
                        >
                            <option value="">選擇科目</option>
                            {sortedAccounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.id} - {acc.name}</option>
                            ))}
                        </select>
                        <input
                            type="text"
                            placeholder="備註"
                            value={line.memo}
                            onChange={(e) => handleLineChange(index, 'memo', e.target.value)}
                            className={`${inputClasses} col-span-3`}
                            list="managed-memos"
                        />
                        <datalist id="managed-memos">
                            {managedMemos.map(memo => (
                                <option key={memo.id} value={memo.text} />
                            ))}
                        </datalist>
                        <input
                            type="number"
                            placeholder="借方"
                            value={line.debit || ''}
                            onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                            className={`${inputClasses} col-span-2 text-right`}
                        />
                        <input
                            type="number"
                            placeholder="貸方"
                            value={line.credit || ''}
                            onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                            className={`${inputClasses} col-span-2 text-right`}
                        />
                         <div className="col-span-1 flex justify-center">
                            {lines.length > 1 && (
                                <button type="button" onClick={() => removeLine(index)} className="text-rose-500 hover:text-rose-700">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                </div>
            </div>

            <button type="button" onClick={addLine} className="mt-4 flex items-center text-stone-300 hover:text-stone-100 text-sm">
                <Plus size={16} className="mr-1" /> 新增一行
            </button>
            
            <div className="mt-4 pt-4 border-t border-stone-700 flex justify-end font-mono text-lg">
                 <div className="grid grid-cols-2 gap-4 w-full sm:w-1/2 lg:w-1/3">
                    <div className={`text-right ${totals.debit !== totals.credit ? 'text-rose-500' : ''}`}>{totals.debit.toLocaleString()}</div>
                    <div className={`text-right ${totals.debit !== totals.credit ? 'text-rose-500' : ''}`}>{totals.credit.toLocaleString()}</div>
                </div>
            </div>
        </>
    );

    const renderTextInput = () => (
        <div className="space-y-4">
             <div className="text-xs text-stone-400 p-3 bg-stone-800 rounded-lg">
                <p>請輸入或貼上分錄資料，每一行代表一筆分錄明細。</p>
                <p className="font-semibold mt-1">格式: <strong>科目ID,摘要,借方,貸方</strong> (請用半形逗號分隔)</p>
                <p className="font-mono text-stone-500 mt-1">範例: 6218,午餐,150,0</p>
            </div>
            <textarea
                rows={5}
                className="bg-stone-950 border border-stone-700 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2.5 placeholder-stone-400 font-mono"
                placeholder="6218,午餐,150,0&#10;1111,付現,0,150"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
            />
            {parsedLines.length > 0 && (
                <div className="border rounded-lg border-stone-700 max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                         <tbody>
                            {parsedLines.map((line, index) => (
                                <tr key={index} className={`${line.error ? 'bg-rose-900/20' : ''}`}>
                                    <td className="p-2 border-b border-stone-700">{line.accountId}</td>
                                    <td className="p-2 border-b border-stone-700">{line.memo}</td>
                                    <td className="p-2 border-b border-stone-700 text-right font-mono">{line.debit?.toLocaleString() || 0}</td>
                                    <td className="p-2 border-b border-stone-700 text-right font-mono">{line.credit?.toLocaleString() || 0}</td>
                                    <td className="p-2 border-b border-stone-700 text-rose-400">{line.error}</td>
                                </tr>
                            ))}
                         </tbody>
                    </table>
                </div>
            )}
             <div className="mt-4 pt-4 border-t border-stone-700 flex justify-end font-mono text-lg">
                 <div className="grid grid-cols-2 gap-4 w-full sm:w-1/2 lg:w-1/3">
                    <div className={`text-right ${textTotals.debit !== textTotals.credit ? 'text-rose-500' : ''}`}>{textTotals.debit.toLocaleString()}</div>
                    <div className={`text-right ${textTotals.debit !== textTotals.credit ? 'text-rose-500' : ''}`}>{textTotals.credit.toLocaleString()}</div>
                </div>
            </div>
        </div>
    );

    return (
        <Modal isOpen={true} onClose={onClose} title={isEditMode ? '編輯日記分錄' : '新增日記分錄'} size="xl">
            {!isEditMode && (
                <div className="flex border-b border-stone-700 mb-4">
                    <button className={tabClasses(mode === 'form')} onClick={() => setMode('form')}>表單輸入</button>
                    <button className={tabClasses(mode === 'text')} onClick={() => setMode('text')}>文字輸入</button>
                </div>
            )}
            <form onSubmit={handleSubmit}>
                 <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium">日期</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={inputClasses}
                    />
                </div>
                
                {mode === 'form' || isEditMode ? renderFormInput() : renderTextInput()}

                {error && 
                    <div className="mt-4 flex items-center text-red-400 text-sm p-3 bg-red-900/20 rounded-lg">
                        <AlertCircle size={18} className="mr-2 flex-shrink-0" />
                        {error}
                    </div>
                }
                
                <div className="flex justify-end mt-6 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-stone-200 bg-stone-800 border border-stone-600 rounded-lg hover:bg-stone-700">
                        取消
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:ring-4 focus:outline-none focus:ring-amber-800">
                        {isEditMode ? '儲存變更' : '儲存分錄'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default JournalEntryForm;