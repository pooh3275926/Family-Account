
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { ArrowUp, ArrowDown, PiggyBank, Calendar, Filter, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

// --- Reusable SVG Chart Components ---

interface ChartDataPoint {
    label: string;
    [key: string]: number | string;
}

interface SeriesConfig {
    key: string;
    color: string;
    name: string;
    type?: 'line' | 'bar';
}

const CompositeChart: React.FC<{ 
    data: ChartDataPoint[]; 
    series: SeriesConfig[]; 
    showLegend?: boolean;
    yAxisMinZero?: boolean;
    showValues?: boolean; 
}> = ({ data, series, showLegend = true, yAxisMinZero = false, showValues = false }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [hoveredData, setHoveredData] = useState<{
        x: number;
        y: number;
        label: string;
        value: string;
        color: string;
        name: string;
    } | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                requestAnimationFrame(() => setDimensions({ width, height }));
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const { width, height } = dimensions;
    const padding = { top: 30, right: 30, bottom: 30, left: 50 };
    
    if (width < 50 || height < 50 || data.length === 0) {
        return (
            <div ref={containerRef} className="w-full h-full flex items-center justify-center text-stone-500 text-sm">
                {data.length === 0 ? "無資料" : "載入中..."}
            </div>
        );
    }

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate Min/Max for Y-Axis
    let yMin = Infinity;
    let yMax = -Infinity;

    data.forEach(d => {
        series.forEach(s => {
            const val = Number(d[s.key] || 0);
            if (val < yMin) yMin = val;
            if (val > yMax) yMax = val;
        });
    });

    if (yMin === Infinity) { yMin = 0; yMax = 100; }
    
    if (yAxisMinZero && yMin > 0) yMin = 0;
    
    // Add padding to Y domain
    const yDomainPadding = (yMax - yMin) * 0.1 || 10;
    const domainMax = yMax + yDomainPadding;
    const domainMin = yMin - yDomainPadding; 
    const yRange = (domainMax - domainMin) || 1;

    const yScale = (val: number) => padding.top + chartHeight - ((val - domainMin) / yRange) * chartHeight;
    const getX = (index: number) => padding.left + (index * (chartWidth / Math.max(1, data.length)));
    const getXCenter = (index: number) => getX(index) + (chartWidth / Math.max(1, data.length)) / 2;
    const colWidth = (chartWidth / Math.max(1, data.length)) * 0.6; 

    const generateLinePath = (key: string) => {
        return data.map((d, i) => {
            const val = Number(d[key] || 0);
            return `${i === 0 ? 'M' : 'L'} ${getXCenter(i)} ${yScale(val)}`;
        }).join(' ');
    };

    const yTicks = 5;
    const yTickValues = Array.from({ length: yTicks }, (_, i) => domainMin + i * (yRange / (yTicks - 1)));

    const handleMouseEnter = (x: number, y: number, label: string, value: number, color: string, name: string) => {
        setHoveredData({
            x, 
            y, 
            label, 
            value: value.toLocaleString(), 
            color, 
            name
        });
    };

    const handleMouseLeave = () => {
        setHoveredData(null);
    };

    return (
        <div ref={containerRef} className="w-full h-full flex flex-col relative group">
            <div className="flex-grow relative w-full overflow-hidden min-h-0">
                <svg width={width} height={height} className="block">
                    {/* Grid Lines */}
                    {yTickValues.map((tick, i) => (
                        <g key={i}>
                            <line x1={padding.left} x2={width - padding.right} y1={yScale(tick)} y2={yScale(tick)} stroke="#44403c" strokeWidth="1" strokeDasharray="4,4" />
                            <text x={padding.left - 10} y={yScale(tick) + 4} textAnchor="end" fill="#a8a29e" fontSize="11" className="font-mono">
                                {tick.toLocaleString(undefined, { notation: 'compact' })}
                            </text>
                        </g>
                    ))}
                    
                    {/* Zero Line */}
                    {domainMin <= 0 && domainMax >= 0 && (
                        <line x1={padding.left} x2={width - padding.right} y1={yScale(0)} y2={yScale(0)} stroke="#78716c" strokeWidth="1" />
                    )}

                    {/* Bars First */}
                    {series.filter(s => s.type === 'bar').map(s => (
                        <g key={s.key} fill={s.color} fillOpacity="0.6">
                            {data.map((d, i) => {
                                const val = Number(d[s.key] || 0);
                                const y = yScale(Math.max(0, val));
                                const h = Math.abs(yScale(val) - yScale(0));
                                const yPos = val >= 0 ? yScale(val) : yScale(0);
                                const cx = getXCenter(i);
                                
                                return (
                                    <React.Fragment key={i}>
                                        <rect 
                                            x={cx - colWidth / 2}
                                            y={yPos}
                                            width={colWidth}
                                            height={h}
                                            rx="2"
                                            className="hover:opacity-80 transition-opacity cursor-pointer"
                                            onMouseEnter={() => handleMouseEnter(cx, yPos, d.label, val, s.color, s.name)}
                                            onMouseLeave={handleMouseLeave}
                                        />
                                        {showValues && (
                                            <text 
                                                x={cx} 
                                                y={yPos - 5} 
                                                textAnchor="middle" 
                                                fill={s.color} 
                                                fontSize="10" 
                                                fontWeight="bold"
                                                className="pointer-events-none"
                                            >
                                                {val.toLocaleString(undefined, { notation: 'compact' })}
                                            </text>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </g>
                    ))}

                    {/* Lines Second */}
                    {series.filter(s => s.type !== 'bar').map(s => (
                        <React.Fragment key={s.key}>
                            <path
                                d={generateLinePath(s.key)}
                                fill="none"
                                stroke={s.color}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Dots & Hover Targets */}
                            {data.map((d, i) => {
                                const val = Number(d[s.key] || 0);
                                const cx = getXCenter(i);
                                const cy = yScale(val);
                                return (
                                    <g key={i}>
                                        <circle 
                                            cx={cx} 
                                            cy={cy} 
                                            r="4" 
                                            fill={s.color} 
                                            stroke="#1c1917" 
                                            strokeWidth="1" 
                                            className="hover:r-6 transition-all cursor-pointer"
                                            onMouseEnter={() => handleMouseEnter(cx, cy, d.label, val, s.color, s.name)}
                                            onMouseLeave={handleMouseLeave}
                                        />
                                        {/* Invisible larger target for easier hovering */}
                                        <circle 
                                            cx={cx} 
                                            cy={cy} 
                                            r="10" 
                                            fill="transparent" 
                                            onMouseEnter={() => handleMouseEnter(cx, cy, d.label, val, s.color, s.name)}
                                            onMouseLeave={handleMouseLeave}
                                        />
                                        {showValues && (
                                            <text 
                                                x={cx} 
                                                y={cy - 8} 
                                                textAnchor="middle" 
                                                fill={s.color} 
                                                fontSize="10" 
                                                fontWeight="bold"
                                                className="pointer-events-none"
                                                style={{ textShadow: '0px 0px 2px rgba(0,0,0,0.8)' }}
                                            >
                                                {val.toLocaleString(undefined, { notation: 'compact' })}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </React.Fragment>
                    ))}

                    {/* X Axis Labels */}
                    {data.map((d, i) => (
                        <text key={i} x={getXCenter(i)} y={height - 5} textAnchor="middle" fill="#a8a29e" fontSize="11">
                            {d.label}
                        </text>
                    ))}
                </svg>

                {/* Tooltip Overlay */}
                {hoveredData && (
                     <div 
                        className="absolute pointer-events-none bg-stone-800 border border-stone-600 rounded px-2 py-1 shadow-xl z-10"
                        style={{ 
                            left: hoveredData.x, 
                            top: hoveredData.y - 40, 
                            transform: 'translateX(-50%)' 
                        }}
                     >
                         <div className="text-xs text-stone-400 mb-0.5">{hoveredData.label}</div>
                         <div className="flex items-center gap-2 whitespace-nowrap">
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredData.color }}></div>
                             <span className="text-xs text-stone-200">{hoveredData.name}:</span>
                             <span className="text-sm font-bold font-mono text-white">{hoveredData.value}</span>
                         </div>
                     </div>
                )}
            </div>
            {showLegend && (
                <div className="flex flex-wrap justify-center gap-4 mt-2 px-2 shrink-0">
                    {series.map(s => (
                        <div key={s.key} className="flex items-center text-xs text-stone-300">
                            {s.type === 'bar' ? (
                                <span className="w-3 h-3 mr-1 opacity-60 rounded-sm" style={{ backgroundColor: s.color }}></span>
                            ) : (
                                <div className="flex items-center mr-1">
                                    <span className="w-3 h-0.5" style={{ backgroundColor: s.color }}></span>
                                    <span className="w-1.5 h-1.5 rounded-full -ml-1.5" style={{ backgroundColor: s.color }}></span>
                                </div>
                            )}
                            {s.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Dashboard Components ---

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-stone-900 p-4 sm:p-6 rounded-xl shadow-lg border border-stone-800 flex flex-col overflow-hidden ${className}`}>
        <h3 className="font-bold text-lg text-stone-100 mb-4 shrink-0">{title}</h3>
        <div className="flex-grow min-h-0 w-full relative">{children}</div>
    </div>
);

const KPICard: React.FC<{ title: string; value: number; icon: React.ElementType; color: string; }> = ({ title, value, icon: Icon, color }) => (
    <div className="bg-stone-900 p-4 rounded-xl shadow-lg flex items-start gap-4 border border-stone-800">
        <div className={`p-3 rounded-lg bg-stone-800`} style={{ color: color }}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-sm text-stone-400">{title}</p>
            <p className="text-2xl font-bold font-mono text-stone-100">{value.toLocaleString()}</p>
        </div>
    </div>
);

const PeriodSelector: React.FC<{
    year: number;
    setYear: (y: number) => void;
    availableYears: number[];
    selectedMonths: Set<number>;
    setSelectedMonths: (m: Set<number>) => void;
}> = ({ year, setYear, availableYears, selectedMonths, setSelectedMonths }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMonth = (m: number) => {
        const newSet = new Set(selectedMonths);
        if (newSet.has(m)) newSet.delete(m);
        else newSet.add(m);
        // Prevent empty selection
        if (newSet.size === 0) newSet.add(m);
        setSelectedMonths(newSet);
    };

    const selectPreset = (type: 'all' | 'q1' | 'q2' | 'q3' | 'q4' | 'h1' | 'h2') => {
        const ranges: Record<string, number[]> = {
            all: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
            q1: [1, 2, 3], q2: [4, 5, 6], q3: [7, 8, 9], q4: [10, 11, 12],
            h1: [1, 2, 3, 4, 5, 6], h2: [7, 8, 9, 10, 11, 12]
        };
        setSelectedMonths(new Set(ranges[type]));
    };
    
    const sortedMonths = Array.from(selectedMonths).sort((a: number, b: number) => a - b);
    const displaySelection = selectedMonths.size === 12 ? "全年" : 
                            selectedMonths.size === 0 ? "請選擇" :
                            `${sortedMonths[0]}月` + (selectedMonths.size > 1 ? `... (+${selectedMonths.size - 1})` : '');

    return (
        <div className="bg-stone-800 p-2 rounded-lg border border-stone-700 flex flex-wrap gap-2 items-center">
             <div className="flex items-center gap-2">
                <Calendar size={18} className="text-stone-400" />
                <select 
                    value={year} 
                    onChange={e => setYear(parseInt(e.target.value))} 
                    className="bg-stone-900 border-none text-white text-sm rounded focus:ring-0 cursor-pointer font-bold"
                >
                    {availableYears.map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
            </div>
            <div className="h-6 w-px bg-stone-600 mx-2"></div>
            <div className="relative">
                <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 text-sm text-stone-200 hover:text-white px-2 py-1 rounded hover:bg-stone-700">
                    <Filter size={16} />
                    <span>{displaySelection}</span>
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                
                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl z-50 p-4">
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <button
                                    key={m}
                                    onClick={() => toggleMonth(m)}
                                    className={`text-xs py-1.5 rounded border ${
                                        selectedMonths.has(m) 
                                        ? 'bg-amber-600 border-amber-600 text-white' 
                                        : 'bg-stone-800 border-stone-600 text-stone-400 hover:border-stone-500'
                                    }`}
                                >
                                    {m}月
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-700">
                             {['All', 'Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2'].map(p => (
                                <button 
                                    key={p} 
                                    onClick={() => selectPreset(p.toLowerCase() as any)}
                                    className="text-xs px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-stone-300"
                                >
                                    {p}
                                </button>
                             ))}
                        </div>
                         <div className="mt-3 text-right">
                            <button onClick={() => setIsOpen(false)} className="text-xs text-amber-500 hover:text-amber-400">完成</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const DashboardView: React.FC = () => {
    const { state } = useAppContext();
    const { journalEntries, accounts } = state;

    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    // Default to all months selected
    const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
    
    // UI Toggle State
    const [showChartValues, setShowChartValues] = useState(false);

    const availableYears = useMemo(() => {
        const years = new Set(journalEntries.map(e => new Date(e.date).getFullYear()));
        if (years.size === 0) years.add(today.getFullYear());
        return Array.from(years).sort((a: number, b: number) => b - a);
    }, [journalEntries]);
    
    // --- Data Processing Helpers ---

    // 1. Pre-closing entries for the selected Year
    const yearEntriesPreClosing = useMemo(() => {
        return journalEntries.filter(entry => {
            const d = new Date(entry.date);
            if (d.getFullYear() !== selectedYear) return false;
            // Exclude closing entries
            if (entry.lines.some(l => l.memo.includes('結轉損益'))) return false;
            return true;
        });
    }, [journalEntries, selectedYear]);

    // 2. Filtered entries based on Month Selection (for KPI & dynamic trend)
    const filteredEntries = useMemo(() => {
        return yearEntriesPreClosing.filter(entry => {
            const m = new Date(entry.date).getMonth() + 1;
            return selectedMonths.has(m);
        });
    }, [yearEntriesPreClosing, selectedMonths]);

    // --- KPI Calculation (Pre-closing, affected by Year & Month) ---
    const kpiData = useMemo(() => {
        let income = 0, expense = 0;
        filteredEntries.forEach(e => e.lines.forEach(l => {
             if (l.accountId.startsWith('4') || l.accountId.startsWith('71')) income += l.credit - l.debit;
             if (l.accountId.startsWith('5') || l.accountId.startsWith('6') || l.accountId.startsWith('72')) expense += l.debit - l.credit;
        }));

        return { income, expense, net: income - expense };
    }, [filteredEntries]);

    // --- Main Trend Chart (Income/Expense/Net) ---
    // Follows the "period changes". Logic: Show breakdown for the *selected months* in chronological order.
    const mainTrendData = useMemo(() => {
        const sortedMonths = Array.from(selectedMonths).sort((a: number, b: number) => a - b);
        return sortedMonths.map(month => {
            let inc = 0, exp = 0;
            const monthEntries = yearEntriesPreClosing.filter(e => (new Date(e.date).getMonth() + 1) === month);
            monthEntries.forEach(e => e.lines.forEach(l => {
                if (l.accountId.startsWith('4') || l.accountId.startsWith('71')) inc += l.credit - l.debit;
                if (l.accountId.startsWith('5') || l.accountId.startsWith('6') || l.accountId.startsWith('72')) exp += l.debit - l.credit;
            }));
            return {
                label: `${month}月`,
                income: inc,
                expense: exp,
                net: inc - exp
            };
        });
    }, [yearEntriesPreClosing, selectedMonths]);

    // --- Credit Card Trends (Specific Accounts, Year based, show all months) ---
    const creditCardTrendData = useMemo(() => {
        const targets = [
            { id: '2411', name: '君如-中信' },
            { id: '2421', name: '微光-中信' },
            { id: '2422', name: '微光-台新' }
        ];

        // For trend, we show 12 months regardless of month filter (user request: "not affected by top period filter, only year")
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        
        return months.map(m => {
            const point: ChartDataPoint = { label: `${m}月` };
            targets.forEach(t => {
                // Calculate "Spending" -> Sum of Credits to these liability accounts
                const amount = yearEntriesPreClosing
                    .filter(e => (new Date(e.date).getMonth() + 1) === m)
                    .reduce((sum, e) => {
                        return sum + e.lines
                            .filter(l => l.accountId === t.id)
                            .reduce((s, l) => s + l.credit, 0); // Credit side of liability = increase in debt = spending
                    }, 0);
                point[t.id] = amount;
            });
            return point;
        });
    }, [yearEntriesPreClosing]);

    // --- Level 4 Trend Charts (Individual Accounts 4/5/6) ---
    // User Requirement: 4, 5, 6 only. No 7. Individual chart per account. No data = hidden.
    const level4ChartsData = useMemo(() => {
        // Map<accountId, number[12]>
        const monthlyData = new Map<string, number[]>();
        const activeAccountIds = new Set<string>();

        yearEntriesPreClosing.forEach(entry => {
            const monthIndex = new Date(entry.date).getMonth(); // 0-11
            entry.lines.forEach(line => {
                const prefix = line.accountId[0];
                // STRICT FILTER: Only 4 (Income), 5 (Expense), 6 (Expense). Exclude 7.
                if (['4', '5', '6'].includes(prefix)) {
                    // Skip transaction lines with 0 value to avoid marking account as active if it only has 0 entries
                    if (Math.abs(line.debit) < 0.001 && Math.abs(line.credit) < 0.001) return;
                    
                    activeAccountIds.add(line.accountId);
                    
                    if (!monthlyData.has(line.accountId)) {
                        monthlyData.set(line.accountId, new Array(12).fill(0));
                    }
                    
                    const values = monthlyData.get(line.accountId)!;
                    // Income (4): Credit - Debit
                    // Expense (5,6): Debit - Credit
                    const amount = prefix === '4' 
                        ? (line.credit - line.debit)
                        : (line.debit - line.credit);
                        
                    values[monthIndex] += amount;
                }
            });
        });

        const sortedAccounts = accounts
            .filter(a => activeAccountIds.has(a.id))
            .sort((a, b) => a.id.localeCompare(b.id));

        return sortedAccounts.map(acc => {
            const values = monthlyData.get(acc.id) || new Array(12).fill(0);
            const chartData = values.map((val, idx) => ({
                label: `${idx + 1}月`,
                value: val
            }));
            
            // Determine color based on type
            let color = '#3b82f6'; 
            if (acc.id.startsWith('4')) color = '#10b981'; // Income Green
            else if (acc.id.startsWith('5')) color = '#f59e0b'; // Expense Fixed Amber
            else if (acc.id.startsWith('6')) color = '#ef4444'; // Expense Daily Red

            return {
                id: acc.id,
                name: acc.name,
                data: chartData,
                color
            };
        });
    }, [yearEntriesPreClosing, accounts]);

    // --- Expense/Income Composition (Existing logic adapted) ---
    const expenseData = useMemo(() => {
        const expenses = new Map<string, { name: string; total: number }>();
        filteredEntries.forEach(entry => {
            entry.lines.forEach(line => {
                if (line.accountId.startsWith('5') || line.accountId.startsWith('6') || line.accountId.startsWith('72')) {
                    const account = accounts.find(a => a.id === line.accountId);
                    const accountName = account ? `${account.id} - ${account.name}` : `${line.accountId}-未知`;
                    const current = expenses.get(line.accountId) || { name: accountName, total: 0 };
                    current.total += line.debit - line.credit;
                    expenses.set(line.accountId, current);
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
                    const accountName = account ? `${account.id} - ${account.name}` : `${line.accountId}-未知`;
                    const current = incomes.get(line.accountId) || { name: accountName, total: 0 };
                    current.total += line.credit - line.debit;
                    incomes.set(line.accountId, current);
                }
            });
        });
        const sortedIncomes = Array.from(incomes.values()).filter(i => i.total > 0).sort((a, b) => b.total - a.total);
        const totalIncome = sortedIncomes.reduce((sum, i) => sum + i.total, 0);
        return { sortedIncomes, totalIncome };
    }, [filteredEntries, accounts]);

    // --- Asset/Liability/Savings Trends ---
    const { assetsTrend, liabilitiesTrend, savingsTrend } = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        
        let assetOpening = 0, liabOpening = 0;
        
        journalEntries.forEach(e => {
            if (new Date(e.date).getFullYear() < selectedYear) {
                e.lines.forEach(l => {
                    if (l.accountId.startsWith('1')) assetOpening += l.debit - l.credit;
                    if (l.accountId.startsWith('2')) liabOpening += l.credit - l.debit;
                });
            }
        });

        const assetData: ChartDataPoint[] = [];
        const liabData: ChartDataPoint[] = [];
        const savingsData: ChartDataPoint[] = [];

        let currentAsset = assetOpening;
        let currentLiab = liabOpening;

        months.forEach(m => {
            const monthEntriesAll = journalEntries.filter(e => {
                const d = new Date(e.date);
                return d.getFullYear() === selectedYear && (d.getMonth() + 1) === m;
            });

            let monthlyAssetChange = 0;
            let monthlyLiabChange = 0;
            
            monthEntriesAll.forEach(e => {
                e.lines.forEach(l => {
                    if (l.accountId.startsWith('1')) monthlyAssetChange += l.debit - l.credit;
                    if (l.accountId.startsWith('2')) monthlyLiabChange += l.credit - l.debit;
                });
            });

            currentAsset += monthlyAssetChange;
            currentLiab += monthlyLiabChange;

            assetData.push({ label: `${m}月`, value: currentAsset });
            liabData.push({ label: `${m}月`, value: currentLiab });

            let monthlyNet = 0;
            const monthEntriesPre = yearEntriesPreClosing.filter(e => (new Date(e.date).getMonth() + 1) === m);
            monthEntriesPre.forEach(e => e.lines.forEach(l => {
                 if (l.accountId.startsWith('4') || l.accountId.startsWith('71')) monthlyNet += l.credit - l.debit;
                 if (l.accountId.startsWith('5') || l.accountId.startsWith('6') || l.accountId.startsWith('72')) monthlyNet -= (l.debit - l.credit);
            }));
            savingsData.push({ label: `${m}月`, value: monthlyNet });
        });
        
        return { assetsTrend: assetData, liabilitiesTrend: liabData, savingsTrend: savingsData };
    }, [journalEntries, selectedYear, yearEntriesPreClosing]);


    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center mb-2 gap-4">
                <div className="flex items-center gap-4">
                    <PeriodSelector 
                        year={selectedYear} 
                        setYear={setSelectedYear} 
                        availableYears={availableYears}
                        selectedMonths={selectedMonths}
                        setSelectedMonths={setSelectedMonths}
                    />
                    <button 
                        onClick={() => setShowChartValues(!showChartValues)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-sm font-medium
                            ${showChartValues 
                                ? 'bg-amber-600 border-amber-500 text-white' 
                                : 'bg-stone-800 border-stone-600 text-stone-400 hover:bg-stone-700'
                            }`}
                    >
                        {showChartValues ? <Eye size={16} /> : <EyeOff size={16} />}
                        <span>顯示數值</span>
                    </button>
                </div>
            </div>

            {/* Row 1: KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                <KPICard title="期間收入 (未結帳)" value={kpiData.income} icon={ArrowUp} color="#10b981" />
                <KPICard title="期間費用 (未結帳)" value={kpiData.expense} icon={ArrowDown} color="#ef4444" />
                <KPICard title="期間結餘 (未結帳)" value={kpiData.net} icon={PiggyBank} color="#3b82f6" />
            </div>
            
            {/* Row 2: Main Trend */}
            <div className="grid grid-cols-1 gap-6">
                <Card title="收支趨勢分析 (依選取期間)" className="h-96">
                    <CompositeChart 
                        data={mainTrendData} 
                        series={[
                            { key: 'net', name: '結餘', color: '#3b82f6', type: 'bar' },
                            { key: 'income', name: '收入', color: '#10b981', type: 'line' },
                            { key: 'expense', name: '費用', color: '#ef4444', type: 'line' }
                        ]}
                        showValues={showChartValues}
                    />
                </Card>
            </div>

            {/* Row 3: Ranks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card title="費用排行 (依科目)" className="lg:col-span-1 h-96">
                    <div className="space-y-3 overflow-y-auto pr-2 pb-14">
                    {expenseData.sortedExpenses.length > 0 ? expenseData.sortedExpenses.slice(0, 10).map(item => (
                        <div key={item.name} className="flex items-center text-sm">
                            <div className="w-2/5 truncate pr-2 text-stone-300" title={item.name}>{item.name}</div>
                            <div className="w-3/5 flex items-center">
                                <div className="flex-grow bg-stone-700 rounded-full h-4">
                                    <div className="bg-rose-500 h-4 rounded-full" style={{ width: `${Math.min(100, (item.total / expenseData.totalExpense) * 100)}%` }}></div>
                                </div>
                                <span className="ml-3 font-mono text-stone-400 w-20 text-right">{item.total.toLocaleString()}</span>
                            </div>
                        </div>
                    )) : <p className="text-center text-stone-500 py-8">無費用資料</p>}
                    </div>
                </Card>
                 <Card title="收入排行 (依科目)" className="lg:col-span-1 h-96">
                     <div className="space-y-3 overflow-y-auto pr-2 pb-14">
                    {incomeData.sortedIncomes.length > 0 ? incomeData.sortedIncomes.slice(0, 10).map(item => (
                        <div key={item.name} className="flex items-center text-sm">
                            <div className="w-2/5 truncate pr-2 text-stone-300" title={item.name}>{item.name}</div>
                            <div className="w-3/5 flex items-center">
                                <div className="flex-grow bg-stone-700 rounded-full h-4">
                                    <div className="bg-emerald-500 h-4 rounded-full" style={{ width: `${Math.min(100, (item.total / incomeData.totalIncome) * 100)}%` }}></div>
                                </div>
                                <span className="ml-3 font-mono text-stone-400 w-20 text-right">{item.total.toLocaleString()}</span>
                            </div>
                        </div>
                    )) : <p className="text-center text-stone-500 py-8">無收入資料</p>}
                    </div>
                </Card>
            </div>
             
             {/* Row 4: Asset - Independent Row */}
             <div className="grid grid-cols-1 gap-6">
                <Card title={`${selectedYear}年 恩典的資產趨勢`} className="h-80">
                     <CompositeChart 
                        data={assetsTrend} 
                        series={[{ key: 'value', name: '資產總額', color: '#0ea5e9' }]} 
                        showLegend={false} 
                        showValues={showChartValues}
                    />
                </Card>
             </div>

             {/* Row 5: Liability - Independent Row */}
             <div className="grid grid-cols-1 gap-6">
                <Card title={`${selectedYear}年 盼望的負債趨勢`} className="h-80">
                    <CompositeChart 
                        data={liabilitiesTrend} 
                        series={[{ key: 'value', name: '負債總額', color: '#f43f5e' }]} 
                        showLegend={false} 
                        showValues={showChartValues}
                    />
                </Card>
             </div>

             {/* Row 6: Savings - Independent Row */}
             <div className="grid grid-cols-1 gap-6">
                <Card title={`${selectedYear}年 本期恩典儲蓄趨勢`} className="h-80">
                     <CompositeChart 
                        data={savingsTrend} 
                        series={[{ key: 'value', name: '單月儲蓄', color: '#f97316' }]} 
                        showLegend={false} 
                        showValues={showChartValues}
                    />
                </Card>
             </div>

             {/* Row 7: Credit Card Trends - Independent Row Section - Each gets a full row */}
             <div className="grid grid-cols-1 gap-6">
                <Card title="君如-中信信用卡" className="h-80">
                    <CompositeChart 
                        data={creditCardTrendData} 
                        series={[{ key: '2411', name: '每月新增消費', color: '#f59e0b' }]} 
                        showLegend={false}
                        yAxisMinZero={true}
                        showValues={showChartValues}
                    />
                </Card>
             </div>
             <div className="grid grid-cols-1 gap-6">
                <Card title="微光-中信信用卡" className="h-80">
                    <CompositeChart 
                        data={creditCardTrendData} 
                        series={[{ key: '2421', name: '每月新增消費', color: '#10b981' }]} 
                        showLegend={false}
                        yAxisMinZero={true}
                        showValues={showChartValues}
                    />
                </Card>
             </div>
             <div className="grid grid-cols-1 gap-6">
                <Card title="微光-台新信用卡" className="h-80">
                    <CompositeChart 
                        data={creditCardTrendData} 
                        series={[{ key: '2422', name: '每月新增消費', color: '#ec4899' }]} 
                        showLegend={false}
                        yAxisMinZero={true}
                        showValues={showChartValues}
                    />
                </Card>
             </div>

             {/* Row 8: Level 4 Individual Trends - 4, 5, 6 only, no 7 */}
             {level4ChartsData.map(chart => (
                 <div key={chart.id} className="grid grid-cols-1 gap-6">
                    <Card title={`${chart.id} ${chart.name} (年度趨勢)`} className="h-80">
                        <CompositeChart 
                            data={chart.data} 
                            series={[{ key: 'value', name: '金額', color: chart.color }]} 
                            showLegend={false}
                            yAxisMinZero={true}
                            showValues={showChartValues}
                        />
                    </Card>
                 </div>
             ))}
        </div>
    );
};

export default DashboardView;
