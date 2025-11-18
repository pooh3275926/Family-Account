import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import ReportContainer from './ReportContainer';

const BalanceSheet: React.FC = () => {
    const { state } = useAppContext();
    const { accounts, journalEntries } = state;
    
    const availableMonths = useMemo(() => {
        const months = new Set(journalEntries.map(e => e.date.substring(0, 7)));
        return Array.from(months).sort((a: string, b: string) => b.localeCompare(a));
    }, [journalEntries]);

    const [selectedMonth, setSelectedMonth] = useState(availableMonths[0] || '');

    const reportData = useMemo(() => {
        if (!selectedMonth) {
             return { assets: {total:0, children: new Map()}, liabilities: {total:0, children: new Map()}, equity: {total:0, children: new Map()} };
        }

        const [year, month] = selectedMonth.split('-').map(Number);
        const lastDayOfMonth = new Date(year, month, 0).toLocaleDateString('sv-SE');
        
        const balances = new Map<string, number>();
        journalEntries.filter(entry => entry.date <= lastDayOfMonth).forEach(entry => {
            entry.lines.forEach(line => {
                const currentBalance = balances.get(line.accountId) || 0;
                balances.set(line.accountId, currentBalance + line.debit - line.credit);
            });
        });
        
        const closedMonthsInYear = new Set<string>();
        journalEntries.forEach(entry => {
            if (!entry.date.startsWith(year.toString())) return;
            const isClosingEntry = entry.lines.some(line => line.memo.includes('結轉損益') || line.memo.includes('結轉至本期恩典儲蓄'));
            if (isClosingEntry) {
                closedMonthsInYear.add(entry.date.substring(0, 7));
            }
        });

        let unclosedNetIncome = 0;
        const yearToDateEntries = journalEntries.filter(entry => 
            entry.date.startsWith(year.toString()) && 
            entry.date <= lastDayOfMonth
        );

        yearToDateEntries.forEach(entry => {
            const entryMonth = entry.date.substring(0, 7);
            if (closedMonthsInYear.has(entryMonth)) return;

            entry.lines.forEach(line => {
                const accountType = line.accountId[0];
                if (['4', '5', '6', '7'].includes(accountType)) {
                    unclosedNetIncome -= (line.debit - line.credit);
                }
            });
        });

        const assets = { total: 0, children: new Map<string, { total: number; children: Map<string, { total: number; accounts: any[] }> }>() };
        const liabilities = { total: 0, children: new Map<string, { total: number; children: Map<string, { total: number; accounts: any[] }> }>() };
        const equity = { total: 0, children: new Map<string, { total: number; children: Map<string, { total: number; accounts: any[] }> }>() };

        accounts.forEach(account => {
            let balance = balances.get(account.id) || 0;

            if (account.id === '3111') {
                balance -= unclosedNetIncome;
            }
            
            const accountType = account.id[0];
            let targetGroup, sign;

            if (accountType === '1') { targetGroup = assets; sign = 1; } 
            else if (accountType === '2') { targetGroup = liabilities; sign = -1; } 
            else if (accountType === '3') { targetGroup = equity; sign = -1; } 
            else return;
            
            if (Math.abs(balance) < 0.001) return;

            let finalBalance = balance * sign;
            
            targetGroup.total += finalBalance;

            if (!targetGroup.children.has(account.level2)) {
                targetGroup.children.set(account.level2, { total: 0, children: new Map() });
            }
            const level2Group = targetGroup.children.get(account.level2)!;
            level2Group.total += finalBalance;

            if (!level2Group.children.has(account.level3)) {
                level2Group.children.set(account.level3, { total: 0, accounts: [] });
            }
            const level3Group = level2Group.children.get(account.level3)!;
            level3Group.total += finalBalance;
            
            level3Group.accounts.push({ ...account, balance: finalBalance });
        });
        
        return { assets, liabilities, equity };

    }, [accounts, journalEntries, selectedMonth]);

    const renderGroup = (group: any, title: string, titleClass: string) => (
        <div className="mb-6">
            <h3 className={`text-xl font-bold p-3 rounded-t-lg ${titleClass}`}>{title}</h3>
            <div className="border-x border-b border-stone-700 rounded-b-lg p-3">
                {Array.from(group.children.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([level2Name, level2Data]: any) => (
                    <div key={level2Name} className="ml-4 my-2">
                        <div className="flex justify-between font-semibold text-stone-300">
                            <span>{level2Name}</span>
                            <span className="font-mono">{level2Data.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                        {Array.from(level2Data.children.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([level3Name, level3Data]: any) => (
                           <div key={level3Name} className="ml-4">
                             {level3Data.accounts.sort((a:any,b:any) => a.id.localeCompare(b.id)).map((acc: any) => (
                                 <div key={acc.id} className="flex justify-between text-sm py-1 border-b border-dashed border-stone-700 last:border-0">
                                     <span className="text-stone-400 pl-4">{acc.id} - {acc.name}</span>
                                     <span className="font-mono">{acc.balance.toLocaleString()}</span>
                                 </div>
                             ))}
                           </div>
                        ))}
                    </div>
                ))}
                <div className="flex justify-between font-bold text-lg mt-4 pt-2 border-t-2 border-amber-500">
                    <span>{title} 總計</span>
                    <span className="font-mono">{group.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </div>
            </div>
        </div>
    );
    
    const controls = (
        <div className="flex items-center gap-2">
            <label htmlFor="month-select" className="text-sm font-medium">月份:</label>
            <select
                id="month-select"
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="p-2 border rounded bg-stone-800 border-stone-600"
            >
                <option value="">選擇月份</option>
                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
        </div>
    );

    return (
        <ReportContainer title="資產負債表" controls={controls}>
            {!selectedMonth ? <p className="text-center text-stone-500 py-10">請選擇一個月份以查看報表。</p> : (
            <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                    {renderGroup(reportData.assets, "恩典的資產", "bg-sky-900/50 text-sky-200")}
                    {renderGroup(reportData.liabilities, "盼望的負債", "bg-rose-900/50 text-rose-200")}
                    {renderGroup(reportData.equity, "所賜的福份", "bg-emerald-900/50 text-emerald-200")}

                    <div className="mt-8 p-4 bg-stone-800 rounded-lg">
                        <div className="flex justify-between font-extrabold text-xl sm:text-2xl">
                            <span>盼望的負債及所賜的福份總計</span>
                            <span className="font-mono">{(reportData.liabilities.total + reportData.equity.total).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className={`flex justify-between font-extrabold text-xl sm:text-2xl mt-2 ${Math.round(reportData.assets.total) === Math.round(reportData.liabilities.total + reportData.equity.total) ? 'text-emerald-500' : 'text-rose-500'}`}>
                            <span>恩典的資產總計</span>
                            <span className="font-mono">{reportData.assets.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                    </div>
                </div>
            </div>
            )}
        </ReportContainer>
    );
};

export default BalanceSheet;
