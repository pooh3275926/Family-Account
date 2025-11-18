import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Zap } from 'lucide-react';
import { JournalEntry } from '../../types';

const ClosingView: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const { accounts, journalEntries } = state;

    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [generatedEntry, setGeneratedEntry] = useState<JournalEntry | null>(null);

    const availableMonths = useMemo(() => {
        const allMonths = new Set<string>();
        journalEntries.forEach(entry => {
            // Only consider entries for P&L accounts for availability
            if (entry.lines.some(l => ['4','5','6','7'].includes(l.accountId[0]))) {
                allMonths.add(entry.date.substring(0, 7)); // YYYY-MM
            }
        });

        const closedMonths = new Set<string>();
        journalEntries.forEach(entry => {
            const month = entry.date.substring(0, 7);
            const isClosing = entry.lines.some(line =>
                line.memo.includes('結轉損益')
            );
            if (isClosing) {
                closedMonths.add(month);
            }
        });

        return Array.from(allMonths).filter(m => !closedMonths.has(m)).sort((a, b) => b.localeCompare(a));
    }, [journalEntries]);
    
     const handlePerformClosing = () => {
        if (!selectedMonth) return;

        const [year, month] = selectedMonth.split('-').map(Number);
        const lastDayOfMonth = new Date(year, month, 0).toLocaleDateString('sv-SE');
        
        const relevantEntries = journalEntries.filter(entry => entry.date.startsWith(selectedMonth));

        const balances = new Map<string, number>();
        relevantEntries.forEach(entry => {
            entry.lines.forEach(line => {
                const accountType = line.accountId[0];
                if (['4', '5', '6', '7'].includes(accountType)) {
                    const currentBalance = balances.get(line.accountId) || 0;
                    balances.set(line.accountId, currentBalance + line.debit - line.credit);
                }
            });
        });
        
        const incomeExpenseAccounts = accounts.filter(acc => ['4', '5', '6', '7'].includes(acc.id[0]));
        let netIncome = 0;
        const closingLines = [];

        for (const account of incomeExpenseAccounts) {
            const balance = balances.get(account.id) || 0;
            if (Math.abs(balance) < 0.001) continue;

            // balance = total_debit - total_credit
            if (balance > 0) {
                // Debit balance, so credit to close
                closingLines.push({ accountId: account.id, debit: 0, credit: balance, memo: '結轉損益' });
            } else {
                // Credit balance, so debit to close
                closingLines.push({ accountId: account.id, debit: -balance, credit: 0, memo: '結轉損益' });
            }
            
            // Net income = SUM(credits) - SUM(debits) for P&L accounts = -SUM(debit - credit) = -SUM(balance)
            netIncome -= balance;
        }

        if (closingLines.length === 0) {
            alert("沒有需要結轉的收入或費用科目。");
            return;
        }
        
        const equityAccountBase = 3112;
        const startYear = 2020;
        const equityAccountId = (equityAccountBase + year - startYear).toString();
        const equityAccount = accounts.find(a => a.id === equityAccountId);

        if (!equityAccount) {
            alert(`錯誤：找不到年份 ${year} 對應的歷年儲蓄科目 (ID: ${equityAccountId})。請先建立該會計科目。`);
            return;
        }

        if (netIncome > 0) { // Profit
            closingLines.push({ accountId: equityAccountId, debit: 0, credit: netIncome, memo: '結轉損益' });
        } else if (netIncome < 0) { // Loss
            closingLines.push({ accountId: equityAccountId, debit: -netIncome, credit: 0, memo: '結轉損益' });
        }

        const dayEntries = journalEntries.filter(entry => entry.date === lastDayOfMonth);
        const maxIdNum = dayEntries.reduce((max, entry) => {
            const parts = entry.id.split('-');
            if (parts.length < 2) return max;
            const lastPart = parts[parts.length - 1];
            // Remove non-numeric characters to handle suffixes like 'CL'
            const numericPart = lastPart.replace(/\D/g, '');
            if (numericPart === '') return max;
            const num = parseInt(numericPart, 10);
            return !isNaN(num) && num > max ? num : max;
        }, 0);

        const voucherId = `${lastDayOfMonth.replace(/-/g, '')}-${(maxIdNum + 1).toString().padStart(2, '0')}`;
        
        const newEntry: JournalEntry = { id: voucherId, date: lastDayOfMonth, lines: closingLines };

        dispatch({
            type: 'ADD_JOURNAL_ENTRY',
            payload: newEntry
        });

        alert("結帳分錄已成功建立！");
        setSelectedMonth(''); // Reset selection
        setGeneratedEntry(newEntry);
    };

    return (
        <div className="bg-stone-900 p-4 sm:p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
            <div className="space-y-4">
                <p className="text-sm text-stone-400">
                    請選擇您要執行結帳的月份。系統會自動將該月份所有損益科目結轉至對應年度的「歷年恩典儲蓄」。
                    已經結帳過的月份將不會出現在列表中。
                </p>

                {availableMonths.length > 0 ? (
                    <div className="flex items-end gap-4">
                        <div className="flex-grow">
                            <label htmlFor="closing-month-select" className="block mb-2 text-sm font-medium text-stone-200">結帳月份</label>
                            <select
                                id="closing-month-select"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-stone-800 border border-stone-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2.5 placeholder-stone-400"
                            >
                                <option value="">-- 選擇月份 --</option>
                                {availableMonths.map(month => (
                                    <option key={month} value={month}>{month}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={handlePerformClosing}
                            disabled={!selectedMonth}
                            className="flex items-center px-4 py-2.5 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 focus:ring-4 focus:outline-none focus:ring-rose-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Zap size={18} className="mr-2" />
                            執行結帳
                        </button>
                    </div>
                ) : (
                    <div className="text-center p-4 bg-stone-800/50 rounded-lg">
                        <p className="font-semibold text-stone-300">沒有可供結帳的月份。</p>
                        <p className="text-xs text-stone-400 mt-1">所有包含帳務的月份都已經結帳過了。</p>
                    </div>
                )}
            </div>
             {generatedEntry && (
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-stone-100 mb-2">最近產生的結帳分錄:</h3>
                     <div className="border border-stone-700 rounded-lg shadow-sm overflow-hidden bg-stone-800/50">
                        <div className="bg-stone-800 px-4 py-2 flex justify-between items-center border-b border-stone-700">
                            <span className="font-semibold text-stone-200">{generatedEntry.date}</span>
                            <span className="text-sm text-stone-400">傳票編號: {generatedEntry.id}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <tbody>
                                    {generatedEntry.lines.map((line, index) => (
                                        <tr key={index} className="border-b border-stone-700 last:border-b-0">
                                            <td className="px-4 py-2">{line.accountId} - {accounts.find(a=>a.id === line.accountId)?.name}</td>
                                            <td className="px-4 py-2">{line.memo}</td>
                                            <td className="px-4 py-2 text-right font-mono">{line.debit ? line.debit.toLocaleString() : ''}</td>
                                            <td className="px-4 py-2 text-right font-mono">{line.credit ? line.credit.toLocaleString() : ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClosingView;