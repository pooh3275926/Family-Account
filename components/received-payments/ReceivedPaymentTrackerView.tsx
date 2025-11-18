



import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { ArchiveRestore, ChevronDown, ChevronRight } from 'lucide-react';

const ReceivedPaymentTrackerView: React.FC = () => {
    const { state } = useAppContext();
    const { accounts, journalEntries } = state;
    const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

    const reportData = useMemo(() => {
        // ID starts with 26 for '預收款' accounts
        const receivedPaymentAccounts = accounts.filter(a => a.id.startsWith('26'));
        const accountIds = new Set(receivedPaymentAccounts.map(a => a.id));

        const balances = new Map<string, number>();
        const transactionsByAccount = new Map<string, any[]>();

        journalEntries.forEach(entry => {
            entry.lines.forEach(line => {
                if (accountIds.has(line.accountId)) {
                     // Calculate balance
                    const currentBalance = balances.get(line.accountId) || 0;
                    balances.set(line.accountId, currentBalance + line.debit - line.credit);
                    // Group transactions
                    if (!transactionsByAccount.has(line.accountId)) {
                        transactionsByAccount.set(line.accountId, []);
                    }
                    transactionsByAccount.get(line.accountId)!.push({
                        date: entry.date,
                        memo: line.memo,
                        debit: line.debit,
                        credit: line.credit,
                    });
                }
            });
        });

        return receivedPaymentAccounts
            .map(account => ({
                id: account.id,
                name: account.name,
                // Liabilities have a credit balance (negative in our calculation), so we multiply by -1 to show as a positive liability amount
                balance: (balances.get(account.id) || 0) * -1,
                details: (transactionsByAccount.get(account.id) || []).sort((a,b) => a.date.localeCompare(b.date)),
            }))
            .filter(item => item.balance !== 0) // Only show accounts with a non-zero balance
            .sort((a, b) => a.id.localeCompare(b.id));

    }, [accounts, journalEntries]);

    const toggleExpand = (accountId: string) => {
        setExpandedAccounts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(accountId)) {
                newSet.delete(accountId);
            } else {
                newSet.add(accountId);
            }
            return newSet;
        });
    };

    return (
        <div className="bg-stone-900 p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center mb-6 gap-4">
                <p className="text-sm text-stone-400">點擊列表項目可展開查看交易明細。</p>
            </div>
            <div className="overflow-x-auto rounded-lg border border-stone-700 max-h-[70vh]">
                <table className="w-full text-sm text-left text-stone-400">
                    <thead className="text-xs text-stone-300 uppercase bg-stone-800 sticky top-0">
                        <tr>
                            <th className="px-6 py-3">科目 (來源)</th>
                            <th className="px-6 py-3 text-right">目前餘額</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.length > 0 ? reportData.map(item => {
                            const isExpanded = expandedAccounts.has(item.id);
                             return (
                                <React.Fragment key={item.id}>
                                    <tr className="border-b bg-stone-900 border-stone-700 hover:bg-stone-800 cursor-pointer" onClick={() => toggleExpand(item.id)}>
                                        <td className="px-6 py-4 font-medium text-white flex items-center">
                                            {isExpanded ? <ChevronDown size={16} className="mr-2" /> : <ChevronRight size={16} className="mr-2" />}
                                            {item.id} - {item.name}
                                        </td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold text-stone-200`}>
                                            {item.balance.toLocaleString()}
                                        </td>
                                    </tr>
                                    {isExpanded && item.details.length > 0 && (
                                        <tr className="bg-stone-950">
                                            <td colSpan={2} className="p-2">
                                                <div className="p-2 bg-stone-900 rounded-md">
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b border-stone-700">
                                                                <th className="p-2 text-left font-medium">日期</th>
                                                                <th className="p-2 text-left font-medium">摘要</th>
                                                                <th className="p-2 text-right font-medium">沖銷 (借)</th>
                                                                <th className="p-2 text-right font-medium">預收 (貸)</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                        {item.details.map((detail, index) => (
                                                            <tr key={index} className="border-b border-stone-700 last:border-0">
                                                                <td className="p-2">{detail.date}</td>
                                                                <td className="p-2">{detail.memo}</td>
                                                                <td className="p-2 text-right font-mono text-rose-500">{detail.debit > 0 ? detail.debit.toLocaleString() : ''}</td>
                                                                <td className="p-2 text-right font-mono text-emerald-500">{detail.credit > 0 ? detail.credit.toLocaleString() : ''}</td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        }) : (
                            <tr>
                                <td colSpan={2} className="text-center py-16 text-stone-500">
                                     <div className="flex flex-col items-center gap-4">
                                        <ArchiveRestore size={48} className="text-stone-600" />
                                        <span>暫無任何預收款資料</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ReceivedPaymentTrackerView;