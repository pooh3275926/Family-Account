



import React, { useState, useCallback, useMemo } from 'react';
import { BookText, FileText, BarChart2, Settings, CreditCard, Menu, X, ClipboardList, ArchiveRestore, BookCopy, Briefcase, LayoutDashboard, Zap, ChevronDown, Database } from 'lucide-react';

import { AppProvider } from './contexts/AppContext';
import ChartOfAccountsView from './components/coa/ChartOfAccountsView';
import JournalView from './components/journal/JournalView';
import BalanceSheet from './components/reports/BalanceSheet';
import IncomeStatement from './components/reports/IncomeStatement';
import AmortizationTable from './components/amortization/AmortizationTable';
import CreditCardLedgerView from './components/credit-card/CreditCardLedgerView';
import PrepaymentTrackerView from './components/prepayments/PrepaymentTrackerView';
import ReceivedPaymentTrackerView from './components/received-payments/ReceivedPaymentTrackerView';
import MemoManagerView from './components/memos/MemoManagerView';
import SalaryLedgerView from './components/salary/SalaryLedgerView';
import DashboardView from './components/dashboard/DashboardView';
import ClosingView from './components/closing/ClosingView';
import BackupRestoreView from './components/system/BackupRestoreView';


type Page = 'dashboard' | 'journal' | 'credit-card' | 'salary' | 'closing' | 'coa' | 'amortization' | 'prepayments' | 'received-payments' | 'memos' | 'balance-sheet' | 'income-statement' | 'backup-restore';


const pageTitles: Record<Page, string> = {
    dashboard: '儀表板',
    journal: '日記簿',
    'credit-card': '信用卡帳務',
    salary: '薪資分錄',
    closing: '結帳分錄',
    coa: '會計科目',
    amortization: '分攤費用表',
    prepayments: '暫付款追蹤表',
    'received-payments': '預收款項追蹤表',
    'balance-sheet': '資產負債表',
    'income-statement': '損益表',
    memos: '摘要管理器',
    'backup-restore': '備份與還原',
};

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Collapsible section states
    const [isCoreOpen, setIsCoreOpen] = useState(true);
    const [isFeaturesOpen, setIsFeaturesOpen] = useState(true);
    const [isReportsOpen, setIsReportsOpen] = useState(true);

    const handleSetPage = (page: Page) => {
        setCurrentPage(page);
        setIsMobileMenuOpen(false);
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <DashboardView />;
            case 'journal': return <JournalView />;
            case 'coa': return <ChartOfAccountsView />;
            case 'balance-sheet': return <BalanceSheet />;
            case 'income-statement': return <IncomeStatement />;
            case 'amortization': return <AmortizationTable />;
            case 'credit-card': return <CreditCardLedgerView />;
            case 'prepayments': return <PrepaymentTrackerView />;
            case 'received-payments': return <ReceivedPaymentTrackerView />;
            case 'memos': return <MemoManagerView />;
            case 'salary': return <SalaryLedgerView />;
            case 'closing': return <ClosingView />;
            case 'backup-restore': return <BackupRestoreView />;
            default: return <DashboardView />;
        }
    };
    
    const NavItem = useCallback(({ page, label, icon: Icon }: { page: Page; label: string; icon: React.ElementType }) => (
        <li
            onClick={() => handleSetPage(page)}
            className={`flex items-center p-3 text-base font-normal rounded-lg cursor-pointer transition-colors duration-150 group ${
                currentPage === page
                    ? 'bg-amber-600 text-white shadow-inner'
                    : 'text-stone-300 hover:bg-stone-700'
            }`}
            role="button"
            aria-current={currentPage === page ? 'page' : undefined}
        >
            <Icon className={`w-6 h-6 transition-colors duration-150 ${currentPage === page ? 'text-white' : 'text-stone-400 group-hover:text-stone-200'}`} />
            <span className="ml-4 whitespace-nowrap">{label}</span>
        </li>
    ), [currentPage]);

    const NavSection: React.FC<{ title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode }> = ({ title, isOpen, onToggle, children }) => (
        <div>
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-2 text-xs font-semibold text-amber-50/60 uppercase tracking-wider hover:bg-stone-700 rounded-md"
            >
                <span>{title}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && <div className="mt-2 space-y-2">{children}</div>}
        </div>
    );
    
    const navItems = useMemo(() => (
        <div className="space-y-4">
            <NavSection title="核心作業" isOpen={isCoreOpen} onToggle={() => setIsCoreOpen(!isCoreOpen)}>
                <NavItem page="dashboard" label="儀表板" icon={LayoutDashboard} />
                <NavItem page="journal" label="日記簿" icon={BookText} />
                <NavItem page="salary" label="薪資分錄" icon={Briefcase} />
                <NavItem page="closing" label="結帳分錄" icon={Zap} />
                <NavItem page="credit-card" label="信用卡帳務" icon={CreditCard} />
            </NavSection>
            <NavSection title="功能選單" isOpen={isFeaturesOpen} onToggle={() => setIsFeaturesOpen(!isFeaturesOpen)}>
                <NavItem page="amortization" label="分攤費用表" icon={ClipboardList} />
                <NavItem page="prepayments" label="暫付款追蹤表" icon={ArchiveRestore} />
                <NavItem page="received-payments" label="預收款項追蹤表" icon={BookCopy} />
                <NavItem page="memos" label="摘要管理器" icon={Settings} />
                <NavItem page="coa" label="會計科目" icon={Settings} />
                <NavItem page="backup-restore" label="備份與還原" icon={Database} />
            </NavSection>
            <NavSection title="財務報表" isOpen={isReportsOpen} onToggle={() => setIsReportsOpen(!isReportsOpen)}>
                <NavItem page="balance-sheet" label="資產負債表" icon={BarChart2} />
                <NavItem page="income-statement" label="損益表" icon={FileText} />
            </NavSection>
        </div>
    ), [NavItem, isCoreOpen, isFeaturesOpen, isReportsOpen]);

    return (
        <AppProvider>
            <div className="flex h-screen bg-stone-950 text-stone-200 overflow-hidden">
                {isMobileMenuOpen && (
                    <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/30 z-30 md:hidden" aria-hidden="true"></div>
                )}

                <aside className={`fixed inset-y-0 left-0 bg-stone-900/80 backdrop-blur-lg shadow-lg transition-transform duration-300 ease-in-out z-40 flex flex-col md:relative md:shadow-xl md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${isDesktopSidebarCollapsed ? 'w-20' : 'w-64'}`}>
                    <div className={`p-4 flex items-center shrink-0 ${isDesktopSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                         {!isDesktopSidebarCollapsed && <h1 className="text-2xl font-bold text-amber-200">會計系統</h1>}
                        <button onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)} className="p-2 rounded-md hover:bg-stone-700 hidden md:block">
                            <Menu size={24} />
                        </button>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-md hover:bg-stone-700 md:hidden">
                            <X size={24} />
                        </button>
                    </div>
                    <nav className={`flex-1 overflow-y-auto p-4 transition-opacity duration-300 ${isDesktopSidebarCollapsed ? 'opacity-0 md:opacity-100' : 'opacity-100'}`}>
                       {isDesktopSidebarCollapsed ? (
                            <div className="flex flex-col items-center space-y-3">
                                <span title="儀表板"><LayoutDashboard onClick={() => handleSetPage('dashboard')} className="cursor-pointer text-stone-500 hover:text-stone-200" /></span>
                                <span title="日記簿"><BookText onClick={() => handleSetPage('journal')} className="cursor-pointer text-stone-500 hover:text-stone-200" /></span>
                                <span title="薪資分錄"><Briefcase onClick={() => handleSetPage('salary')} className="cursor-pointer text-stone-500 hover:text-stone-200" /></span>
                                <span title="結帳分錄"><Zap onClick={() => handleSetPage('closing')} className="cursor-pointer text-stone-500 hover:text-stone-200" /></span>
                                <span title="信用卡帳務"><CreditCard onClick={() => handleSetPage('credit-card')} className="cursor-pointer text-stone-500 hover:text-stone-200" /></span>
                                <div className="w-full border-t border-stone-600 my-2"></div>
                                <span title="分攤費用表"><ClipboardList onClick={() => handleSetPage('amortization')} className="cursor-pointer text-stone-500 hover:text-stone-200" /></span>
                                <span title="暫付款追蹤表"><ArchiveRestore onClick={() => handleSetPage('prepayments')} className="cursor-pointer text-stone-500 hover:text-stone-200" /></span>
                                <span title="預收款項追蹤表"><BookCopy onClick={() => handleSetPage('received-payments')} className="cursor-pointer text-stone-500 hover:text-stone-200" /></span>
                                <span title="摘要管理器"><Settings onClick={() => handleSetPage('memos')} className="cursor-pointer text-stone-500 hover:text-stone-200" /></span>
                                <span title="會計科目"><Settings onClick={() => handleSetPage('coa')} className="cursor-pointer text-stone-500 hover:text-stone-200" /></span>
                                <span title="備份與還原"><Database onClick={() => handleSetPage('backup-restore')} className="cursor-pointer text-stone-500 hover:text-stone-200" /></span>
                                <div className="w-full border-t border-stone-600 my-2"></div>
                                <span title="資產負債表"><BarChart2 onClick={() => handleSetPage('balance-sheet')} className="cursor-pointer text-stone-500 hover:text-stone-200" /></span>
                                <span title="損益表"><FileText onClick={() => handleSetPage('income-statement')} className="cursor-pointer text-stone-500 hover:text-stone-200" /></span>
                            </div>
                        ) : navItems}
                    </nav>
                </aside>
                
                <div className="flex-1 flex flex-col">
                     <header className="md:hidden flex items-center justify-between p-4 bg-stone-900/80 backdrop-blur-sm shadow-md z-20">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-md hover:bg-stone-700">
                            <Menu size={24} />
                        </button>
                        <h2 className="text-lg font-bold">{pageTitles[currentPage]}</h2>
                        <div className="w-10"></div>
                    </header>

                    <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                        <div className="hidden md:block mb-6">
                           <h1 className="text-3xl font-bold text-stone-100">{pageTitles[currentPage]}</h1>
                        </div>
                        {renderPage()}
                    </main>
                </div>
            </div>
        </AppProvider>
    );
};

export default App;