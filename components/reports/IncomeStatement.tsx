import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import ReportContainer from './ReportContainer';

type PeriodType = 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';

const IncomeStatement: React.FC = () => {
    const { data } = useData();
    const { accounts, journalEntries } = data;
    
    const today = new Date();
    
    const availableYears = useMemo(() => {
        const years = new Set(journalEntries.map(e => new Date(e.date).getFullYear()));
        if (years.size === 0) years.add(today.getFullYear());
        return Array.from(years).sort((a: number, b: number) => b - a);
    }, [journalEntries]);

    const [selectedYear, setSelectedYear] = useState(availableYears[0] || today.getFullYear());
    const [periodType, setPeriodType] = useState<PeriodType>('monthly');
    const [periodValue, setPeriodValue] = useState<number>(today.getMonth() + 1);
    const [isPostClosing, setIsPostClosing] = useState(false);


    const reportData = useMemo(() => {
        const year = selectedYear;
        const findLevel1Name = (prefix: string) => accounts.find(a => a.level1.startsWith(prefix))?.level1 || `科目 ${prefix}`;
        const findLevel2Name = (prefix: string) => accounts.find(a => a.level2.startsWith(prefix))?.level2;

        let filteredEntries;
        const balances = new Map<string, number>();

        let startDateStr: string;
        let endDateStr: string;

        switch (periodType) {
            case 'quarterly': {
                const startMonthQ = (periodValue - 1) * 3 + 1;
                const endMonthQ = startMonthQ + 2;
                startDateStr = `${year}-${startMonthQ.toString().padStart(2, '0')}-01`;
                endDateStr = new Date(year, endMonthQ, 0).toLocaleDateString('sv-SE');
                break;
            }
            case 'half_yearly': {
                const startMonthH = (periodValue - 1) * 6 + 1;
                const endMonthH = startMonthH + 5;
                startDateStr = `${year}-${startMonthH.toString().padStart(2, '0')}-01`;
                endDateStr = new Date(year, endMonthH, 0).toLocaleDateString('sv-SE');
                break;
            }
            case 'yearly': {
                startDateStr = `${year}-01-01`;
                endDateStr = `${year}-12-31`;
                break;
            }
            case 'monthly':
            default: {
                const month = periodValue;
                startDateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
                endDateStr = new Date(year, month, 0).toLocaleDateString('sv-SE');
                break;
            }
        }

        if (isPostClosing) {
            const closedMonths = new Set<string>();
            journalEntries.forEach(entry => {
                const isClosingEntry = entry.lines.some(line => line.memo.includes('結轉損益'));
                if (isClosingEntry) {
                    closedMonths.add(entry.date.substring(0, 7));
                }
            });

            filteredEntries = journalEntries.filter(entry => {
                if (entry.date < startDateStr || entry.date > endDateStr) return false;
                const entryMonth = entry.date.substring(0, 7);
                return !closedMonths.has(entryMonth);
            });
            
            filteredEntries.forEach(entry => {
                entry.lines.forEach(line => {
                     const accountType = line.accountId[0];
                    if (['4', '5', '6', '7'].includes(accountType)) {
                        const currentBalance = balances.get(line.accountId) || 0;
                        balances.set(line.accountId, currentBalance + line.debit - line.credit);
                    }
                });
            });

        } else {
            filteredEntries = journalEntries.filter(entry => 
                entry.date >= startDateStr && entry.date <= endDateStr &&
                !entry.lines.some(line => line.memo.includes('結轉損益'))
            );

            filteredEntries.forEach(entry => {
                entry.lines.forEach(line => {
                    const currentBalance = balances.get(line.accountId) || 0;
                    balances.set(line.accountId, currentBalance + line.debit - line.credit);
                });
            });
        }
        
        const group4 = { title: findLevel1Name('4-'), total: 0, children: new Map<string, { total: number; accounts: any[] }>() };
        const group5 = { title: findLevel1Name('5-'), total: 0, children: new Map<string, { total: number; accounts: any[] }>() };
        const group6 = { title: findLevel1Name('6-'), total: 0, children: new Map<string, { total: number; accounts: any[] }>() };
        const blessings = { title: findLevel2Name('71-') || '領受祝福', total: 0, children: new Map<string, { total: number; accounts: any[] }>() };
        const trials = { title: findLevel2Name('72-') || '面對試煉', total: 0, children: new Map<string, { total: number; accounts: any[] }>() };
        
        accounts.forEach(account => {
            const balance = balances.get(account.id) || 0;
            if (Math.abs(balance) < 0.001) return;

            let targetGroup: any, finalBalance: number;

            if (account.id.startsWith('4')) {
                targetGroup = group4;
                finalBalance = balance * -1;
            } else if (account.id.startsWith('5')) {
                targetGroup = group5;
                finalBalance = balance;
            } else if (account.id.startsWith('6')) {
                targetGroup = group6;
                finalBalance = balance;
            } else if (account.id.startsWith('71')) {
                targetGroup = blessings;
                finalBalance = balance * -1;
            } else if (account.id.startsWith('72')) {
                targetGroup = trials;
                finalBalance = balance;
            } else {
                return;
            }

            targetGroup.total += finalBalance;

            if (!targetGroup.children.has(account.level2)) {
                targetGroup.children.set(account.level2, { total: 0, accounts: [] });
            }
            const level2Group = targetGroup.children.get(account.level2)!;
            level2Group.total += finalBalance;
            level2Group.accounts.push({ ...account, balance: finalBalance });
        });
        
        const totalIncome = group4.total + blessings.total;
        const totalExpense = group5.total + group6.total + trials.total;
        const netIncome = totalIncome - totalExpense;

        return { group4, group5, group6, blessings, trials, netIncome };

    }, [accounts, journalEntries, selectedYear, periodType, periodValue, isPostClosing]);

    const renderGroup = (group: any, titleClass: string, isExpense: boolean = false) => {
        if (group.total === 0) return null;
         return (
         <div className="mb-4">
            <h3 className={`text-lg font-bold p-3 rounded-t-lg ${titleClass}`}>{group.title}</h3>
            <div className="border-x border-b border-stone-700 rounded-b-lg p-3">
                {Array.from(group.children.entries()).sort((a,b) => a[0].localeCompare(b[0])).map(([level2Name, level2Data]: any) => (
                    <div key={level2Name} className="ml-4 my-1">
                        {level2Data.accounts.sort((a:any, b:any) => a.id.localeCompare(b.id)).map((acc: any) => (
                             <div key={acc.id} className="flex justify-between text-sm py-1">
                                 <span className="text-stone-400 pl-4">{acc.id} - {acc.name}</span>
                                 <span className="font-mono">{acc.balance.toLocaleString()}</span>
                             </div>
                         ))}
                    </div>
                ))}
                 <div className="flex justify-between font-bold text-md mt-2 pt-2 border-t border-stone-600">
                    <span>{group.title} 總計</span>
                    <span className="font-mono">{group.total.toLocaleString()}</span>
                </div>
            </div>
        </div>
        );
    };
    
    const handlePeriodTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPeriodType(e.target.value as PeriodType);
        setPeriodValue(1);
    };

    const controls = (
        <div className="flex flex-wrap items-center gap-2">
             <select
                value={selectedYear}
                onChange={e => setSelectedYear(parseInt(e.target.value))}
                className="p-2 border rounded bg-stone-800 border-stone-600"
            >
                {availableYears.map(y => <option key={y} value={y}>{y}年</option>)}
            </select>
            <select
                value={periodType}
                onChange={handlePeriodTypeChange}
                className="p-2 border rounded bg-stone-800 border-stone-600"
            >
                <option value="monthly">月報</option>
                <option value="quarterly">季報</option>
                <option value="half_yearly">半年報</option>
                <option value="yearly">年報</option>
            </select>
            {periodType === 'monthly' && (
                 <select
                    value={periodValue}
                    onChange={e => setPeriodValue(parseInt(e.target.value))}
                    className="p-2 border rounded bg-stone-800 border-stone-600"
                >
                    {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
                </select>
            )}
            {periodType === 'quarterly' && (
                <select
                    value={periodValue}
                    onChange={e => setPeriodValue(parseInt(e.target.value))}
                    className="p-2 border rounded bg-stone-800 border-stone-600"
                >
                    <option value={1}>第一季 (1-3月)</option>
                    <option value={2}>第二季 (4-6月)</option>
                    <option value={3}>第三季 (7-9月)</option>
                    <option value={4}>第四季 (10-12月)</option>
                </select>
            )}
             {periodType === 'half_yearly' && (
                <select
                    value={periodValue}
                    onChange={e => setPeriodValue(parseInt(e.target.value))}
                   className="p-2 border rounded bg-stone-800 border-stone-600"
                >
                    <option value={1}>上半年 (1-6月)</option>
                    <option value={2}>下半年 (7-12月)</option>
                </select>
            )}
            <div className="flex items-center pl-4">
                <input 
                    id="post-closing-checkbox" 
                    type="checkbox" 
                    checked={isPostClosing} 
                    onChange={e => setIsPostClosing(e.target.checked)}
                    className="w-4 h-4 text-amber-600 bg-stone-700 border-stone-500 rounded focus:ring-amber-500 focus:ring-2"
                />
                <label htmlFor="post-closing-checkbox" className="ml-2 text-sm font-medium text-stone-300">結帳後損益表</label>
            </div>
        </div>
    );

    return (
        <ReportContainer title="損益表" controls={controls}>
            <div className="space-y-4 overflow-x-auto">
                <div className="min-w-[600px]">
                    {renderGroup(reportData.group4, "bg-sky-900/50 text-sky-200")}
                    {renderGroup(reportData.blessings, "bg-violet-900/50 text-violet-200")}
                    {renderGroup(reportData.group5, "bg-amber-900/50 text-amber-200", true)}
                    {renderGroup(reportData.group6, "bg-orange-900/50 text-orange-200", true)}
                    {renderGroup(reportData.trials, "bg-rose-900/50 text-rose-200", true)}

                    <div className="flex justify-between font-extrabold text-2xl p-4 mt-4 bg-emerald-800/60 text-emerald-100 rounded-lg">
                        <span>本期恩典儲蓄</span>
                        <span className="font-mono">{reportData.netIncome.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                </div>
            </div>
        </ReportContainer>
    );
};

export default IncomeStatement;