
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { ArrowUp, ArrowDown, PiggyBank } from 'lucide-react';

// --- Reusable Components within Dashboard ---

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-stone-900 p-4 sm:p-6 rounded-xl shadow-lg ${className}`}>
        <h3 className="font-bold text-lg text-stone-100 mb-4">{title}</h3>
        <div className="h-full">{children}</div>
    </div>
);

const KPICard: React.FC<{ title: string; value: number; icon: React.ElementType; color: string; }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-stone-900 p-4 rounded-xl shadow-lg flex items-start gap-4">
        <div className={`p-3 rounded-lg`} style={{ backgroundColor: `${color}20`, color: color }}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-sm text-stone-400">{title}</p>
            <p className="text-2xl font-bold font-mono text-stone-100">{value.toLocaleString()}</p>
        </div>
    </div>
);

const TrendChart: React.FC<{ data: { label: string; value: number }[]; stroke: string; }> = ({ data, stroke }) => {
    if (data.length < 2) return <div className="flex items-center justify-center h-full text-stone-500">資料不足</div>;

    const width = 500;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const values = data.map(d => d.value);
    const yMin = Math.min(...values, 0);
    const yMax = Math.max(...values, 0);
    const yRange = yMax - yMin === 0 ? 1 : yMax - yMin;
    
    const yScale = (val: number) => padding.top + chartHeight - ((val - yMin) / yRange) * chartHeight;
    const xScale = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;

    const pathData = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`).join(' ');

    const yTicksCount = 5;
    const yTickValues = Array.from({ length: yTicksCount }, (_, i) => yMin + i * (yRange / (yTicksCount - 1)));
    
    const xTicks = data.filter((d, i) => i === 0 || (i+1) % 3 === 0 || i === data.length - 1);


    return (
        <div className="h-64">
             <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                {yTickValues.map((tick, i) => (
                    <g key={i} className="text-xs text-stone-600">
                        <line x1={padding.left} x2={width - padding.right} y1={yScale(tick)} y2={yScale(tick)} stroke="currentColor" strokeDasharray="2,2" />
                        <text x={padding.left - 8} y={yScale(tick) + 3} textAnchor="end" fill="currentColor" className="text-stone-400">
                            {tick.toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 1 })}
                        </text>
                    </g>
                ))}

                {xTicks.map((tick, i) => (
                    <text key={i} x={xScale(data.indexOf(tick))} y={height - padding.bottom + 15} textAnchor="middle" fill="currentColor" className="text-xs text-stone-400">
                        {tick.label}
                    </text>
                ))}
                
                <path d={pathData} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        </div>
    );
};


const DonutChart: React.FC<{ data: { name: string; value: number; color: string }[] }> = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return <div className="flex items-center justify-center h-full text-stone-500">無資料</div>;

    let accumulatedAngle = 0;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 h-full">
            <svg viewBox="0 0 100 100" className="w-32 h-32 transform -rotate-90">
                 <circle cx="50" cy="50" r="40" fill="transparent" stroke="#44403c" strokeWidth="20" />
                {data.map((item, index) => {
                    const percentage = item.value / total;
                    const angle = percentage * 360;
                    const strokeDasharray = `${angle} ${360 - angle}`;
                    const strokeDashoffset = -accumulatedAngle;
                    accumulatedAngle += angle;
                    return (
                        <circle
                            key={index}
                            cx="50" cy="50" r="40"
                            fill="transparent"
                            stroke={item.color}
                            strokeWidth="20"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                        />
                    );
                })}
            </svg>
            <div className="text-sm space-y-2">
                {data.map((item) => (
                    <div key={item.name} className="flex items-center">
                        <span className="w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: item.color }}></span>
                        <span className="truncate flex-1">{item.name}</span>
                        <span className="font-mono ml-4 text-stone-400">{((item.value / total) * 100).toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const DashboardView: React.FC = () => {
    const { state } = useAppContext();
    const { journalEntries, accounts } = state;

    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);

    const availableYears = useMemo(() => {
        const years = new Set(journalEntries.map(e => new Date(e.date).getFullYear()));
        if (years.size === 0) years.add(today.getFullYear());
        // FIX: Explicitly type sort function parameters to resolve arithmetic operation error on 'unknown' types.
        return Array.from(years).sort((a: number, b: number) => b - a);
    }, [journalEntries]);
    
    const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || '未知科目';

    // --- Data Calculations ---

    const filteredEntries = useMemo(() => {
        return journalEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            const yearMatch = entryDate.getFullYear() === selectedYear;
            const monthMatch = selectedMonth === 0 || (entryDate.getMonth() + 1) === selectedMonth;
            return yearMatch && monthMatch;
        });
    }, [journalEntries, selectedYear, selectedMonth]);

    const kpiData = useMemo(() => {
        let income = 0, expense = 0;
        filteredEntries.forEach(e => e.lines.forEach(l => {
            if (l.accountId.startsWith('4') || l.accountId.startsWith('71')) income += l.credit - l.debit;
            if (l.accountId.startsWith('5') || l.accountId.startsWith('6') || l.accountId.startsWith('72')) expense += l.debit - l.credit;
        }));
        return { income, expense, net: income - expense };
    }, [filteredEntries]);
    
    const expenseData = useMemo(() => {
        const expenses = new Map<string, { name: string; total: number }>();
        filteredEntries.forEach(entry => {
            entry.lines.forEach(line => {
                if (line.accountId.startsWith('5') || line.accountId.startsWith('6') || line.accountId.startsWith('72')) {
                    const account = accounts.find(a => a.id === line.accountId);
                    const accountName = account ? `${account.level3}` : `${line.accountId}-未知`;
                    const current = expenses.get(accountName) || { name: accountName, total: 0 };
                    current.total += line.debit;
                    expenses.set(accountName, current);
                }
            });
        });
        const sortedExpenses = Array.from(expenses.values()).filter(e => e.total > 0).sort((a, b) => b.total - a.total);
        const totalExpense = sortedExpenses.reduce((sum, e) => sum + e.total, 0);
        return { sortedExpenses, totalExpense };
    }, [filteredEntries, accounts]);
    
    const incomeData = useMemo(() => {
        const incomes = new Map<string, { name: string; total: number }>();
        filteredEntries.forEach(entry => {
            entry.lines.forEach(line => {
                if (line.accountId.startsWith('4') || line.accountId.startsWith('71')) {
                    const account = accounts.find(a => a.id === line.accountId);
                    const accountName = account ? `${account.level3}` : `${line.accountId}-未知`;
                    const current = incomes.get(accountName) || { name: accountName, total: 0 };
                    current.total += line.credit;
                    incomes.set(accountName, current);
                }
            });
        });
        const sortedIncomes = Array.from(incomes.values()).filter(i => i.total > 0).sort((a, b) => b.total - a.total);
        const totalIncome = sortedIncomes.reduce((sum, i) => sum + i.total, 0);
        return { sortedIncomes, totalIncome };
    }, [filteredEntries, accounts]);

    const savingsTrend = useMemo(() => {
        const SAVINGS_ACCOUNT_ID = '3111';
        let balanceStartOfYear = 0;
        journalEntries
            .filter(e => new Date(e.date).getFullYear() < selectedYear)
            .forEach(e => {
                e.lines.forEach(l => {
                    if (l.accountId === SAVINGS_ACCOUNT_ID) {
                        balanceStartOfYear += l.credit - l.debit;
                    }
                });
            });

        const yearEntries = journalEntries
            .filter(e => new Date(e.date).getFullYear() === selectedYear)
            .sort((a,b) => a.date.localeCompare(b.date));

        const monthlyBalances: Record<string, number> = {};
        let currentBalance = balanceStartOfYear;

        yearEntries.forEach(entry => {
             entry.lines.forEach(line => {
                if (line.accountId === SAVINGS_ACCOUNT_ID) {
                    // FIX: Corrected typo from 'l.debit' to 'line.debit'.
                    currentBalance += line.credit - line.debit;
                }
            });
            monthlyBalances[entry.date.substring(5, 7)] = currentBalance;
        });

        const trendData = [];
        let lastKnownBalance = balanceStartOfYear;
        for (let i = 1; i <= 12; i++) {
            const monthKey = i.toString().padStart(2, '0');
            if (monthlyBalances[monthKey] !== undefined) {
                lastKnownBalance = monthlyBalances[monthKey];
            }
            trendData.push({
                label: `${i}月`,
                value: lastKnownBalance,
            });
        }
        return trendData;
    }, [journalEntries, selectedYear]);


    const netWorthData = useMemo(() => {
        const balances = new Map<string, number>();
        journalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                balances.set(line.accountId, (balances.get(line.accountId) || 0) + line.debit - line.credit);
            });
        });
        let assets = 0, liabilities = 0;
        balances.forEach((balance, accountId) => {
            if (accountId.startsWith('1')) assets += balance;
            if (accountId.startsWith('2')) liabilities += -balance; // Liabilities are credit balances
        });
        return { assets, liabilities, netWorth: assets - liabilities };
    }, [journalEntries]);


    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="p-2 border rounded bg-stone-800 border-stone-700">
                    {availableYears.map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
                <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="p-2 border rounded bg-stone-800 border-stone-700">
                    <option value={0}>全年</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                <KPICard title="期間收入" value={kpiData.income} icon={ArrowUp} color="#10b981" />
                <KPICard title="期間費用" value={kpiData.expense} icon={ArrowDown} color="#ef4444" />
                <KPICard title="期間結餘" value={kpiData.net} icon={PiggyBank} color="#3b82f6" />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card title="費用排行 (依科目)" className="lg:col-span-1">
                    <div className="space-y-3">
                    {expenseData.sortedExpenses.length > 0 ? expenseData.sortedExpenses.slice(0, 5).map(item => (
                        <div key={item.name} className="flex items-center text-sm">
                            <div className="w-2/5 truncate pr-2 text-stone-300">{item.name}</div>
                            <div className="w-3/5 flex items-center">
                                <div className="flex-grow bg-stone-700 rounded-full h-5">
                                    <div className="bg-rose-500 h-5 rounded-full" style={{ width: `${(item.total / expenseData.totalExpense) * 100}%` }}></div>
                                </div>
                                <span className="ml-3 font-mono text-stone-400 w-20 text-right">{item.total.toLocaleString()}</span>
                            </div>
                        </div>
                    )) : <p className="text-center text-stone-500 py-8">無費用資料</p>}
                    </div>
                </Card>
                 <Card title="收入排行 (依科目)" className="lg:col-span-1">
                     <div className="space-y-3">
                    {incomeData.sortedIncomes.length > 0 ? incomeData.sortedIncomes.slice(0, 5).map(item => (
                        <div key={item.name} className="flex items-center text-sm">
                            <div className="w-2/5 truncate pr-2 text-stone-300">{item.name}</div>
                            <div className="w-3/5 flex items-center">
                                <div className="flex-grow bg-stone-700 rounded-full h-5">
                                    <div className="bg-emerald-500 h-5 rounded-full" style={{ width: `${(item.total / incomeData.totalIncome) * 100}%` }}></div>
                                </div>
                                <span className="ml-3 font-mono text-stone-400 w-20 text-right">{item.total.toLocaleString()}</span>
                            </div>
                        </div>
                    )) : <p className="text-center text-stone-500 py-8">無收入資料</p>}
                    </div>
                </Card>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card title={`${selectedYear}年 本期恩典儲蓄趨勢`} className="lg:col-span-3">
                    <TrendChart data={savingsTrend} stroke="#f97316" />
                </Card>
                 <Card title="資產負債結構" className="lg:col-span-2">
                    <DonutChart data={[
                        { name: '資產', value: netWorthData.assets, color: '#38bdf8'},
                        { name: '負債', value: netWorthData.liabilities, color: '#f43f5e'},
                    ]} />
                </Card>
            </div>
        </div>
    );
};

export default DashboardView;
