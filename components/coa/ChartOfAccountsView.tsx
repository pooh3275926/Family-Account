import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Account } from '../../types';
import AccountForm from './AccountForm';
import { Plus, Edit, Trash2 } from 'lucide-react';
import ConfirmationModal from '../ui/ConfirmationModal';

const ChartOfAccountsView: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<string | null>(null);

    const handleAddAccount = () => {
        setEditingAccount(null);
        setIsModalOpen(true);
    };

    const handleEditAccount = (account: Account) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };

    const handleDeleteAccount = (accountId: string) => {
        setAccountToDelete(accountId);
        setIsConfirmModalOpen(true);
    };

    const confirmDelete = () => {
        if (accountToDelete) {
            const isAccountInUse = state.journalEntries.some(entry => 
                entry.lines.some(line => line.accountId === accountToDelete)
            );
            
            const isLiabilityAccountInUse = state.creditCardLedgers.some(ledger => ledger.liabilityAccountId === accountToDelete);
            
            const isCreditAccountInUse = state.amortizationItems.some(item => item.creditAccountId === accountToDelete);
            const isDebitAccountInUse = state.amortizationItems.some(item => item.debitAccountId === accountToDelete);

            if (isAccountInUse || isLiabilityAccountInUse || isCreditAccountInUse || isDebitAccountInUse) {
                alert('此會計科目已被使用，無法刪除。請先移除相關的分錄、信用卡帳本或分攤項目。');
            } else {
                dispatch({ type: 'DELETE_ACCOUNT', payload: accountToDelete });
            }
        }
        setIsConfirmModalOpen(false);
        setAccountToDelete(null);
    };
    
    const sortedAccounts = useMemo(() => {
        return [...state.accounts].sort((a, b) => a.id.localeCompare(b.id));
    }, [state.accounts]);

    const filteredAccounts = useMemo(() => {
        return sortedAccounts.filter(acc =>
            acc.id.includes(searchTerm) ||
            acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acc.level1.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acc.level2.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acc.level3.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [sortedAccounts, searchTerm]);

    return (
        <div className="bg-stone-900 p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center mb-6 gap-4">
                <button
                    onClick={handleAddAccount}
                    className="flex items-center bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors duration-200 shadow"
                >
                    <Plus size={20} className="mr-2" />
                    新增科目
                </button>
            </div>

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="搜尋科目編號、名稱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-stone-700 rounded-lg bg-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
            </div>
            
            <div className="overflow-x-auto max-h-[70vh] rounded-lg border border-stone-700">
                <table className="w-full text-sm text-left text-stone-400">
                    <thead className="text-xs text-stone-300 uppercase bg-stone-800 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3">科目編號</th>
                            <th scope="col" className="px-6 py-3">科目名稱</th>
                            <th scope="col" className="px-6 py-3 hidden md:table-cell">一階科目</th>
                            <th scope="col" className="px-6 py-3 hidden lg:table-cell">二階科目</th>
                            <th scope="col" className="px-6 py-3 hidden lg:table-cell">三階科目</th>
                            <th scope="col" className="px-6 py-3 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAccounts.map(account => (
                            <tr key={account.id} className="border-b bg-stone-900 border-stone-700 hover:bg-stone-800">
                                <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{account.id}</td>
                                <td className="px-6 py-4">{account.name}</td>
                                <td className="px-6 py-4 hidden md:table-cell">{account.level1}</td>
                                <td className="px-6 py-4 hidden lg:table-cell">{account.level2}</td>
                                <td className="px-6 py-4 hidden lg:table-cell">{account.level3}</td>
                                <td className="px-6 py-4 flex justify-center space-x-2">
                                    <button onClick={() => handleEditAccount(account)} className="text-stone-400 hover:text-stone-200 transition-colors" aria-label={`Edit ${account.name}`}><Edit size={18} /></button>
                                    <button onClick={() => handleDeleteAccount(account.id)} className="text-rose-500 hover:text-rose-400 transition-colors" aria-label={`Delete ${account.name}`}><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <AccountForm
                    account={editingAccount}
                    onClose={() => setIsModalOpen(false)}
                />
            )}

            {isConfirmModalOpen && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={confirmDelete}
                    title="確認刪除會計科目"
                    message="您確定要刪除這個會計科目嗎？此操作無法復原。"
                />
            )}
        </div>
    );
};

export default ChartOfAccountsView;