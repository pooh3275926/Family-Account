import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Account } from '../../types';
import Modal from '../ui/Modal';

interface AccountFormProps {
    account: Account | null;
    onClose: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ account, onClose }) => {
    const { data, dispatch } = useData();
    const { accounts } = data;
    const isEditMode = !!account;

    const [formData, setFormData] = useState<Account>({
        id: '',
        name: '',
        level1: '',
        level2: '',
        level3: '',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEditMode) {
            setFormData(account);
        }
    }, [account, isEditMode]);

    // --- Cascading Dropdown Logic ---

    const level1Options = useMemo(() => {
        const uniqueLevel1 = new Set(accounts.map(acc => acc.level1));
        return Array.from(uniqueLevel1).sort();
    }, [accounts]);

    const level2Options = useMemo(() => {
        if (!formData.level1) return [];
        const uniqueLevel2 = new Set(
            accounts
                .filter(acc => acc.level1 === formData.level1)
                .map(acc => acc.level2)
        );
        return Array.from(uniqueLevel2).sort();
    }, [accounts, formData.level1]);

    const level3Options = useMemo(() => {
        if (!formData.level2) return [];
        const uniqueLevel3 = new Set(
            accounts
                .filter(acc => acc.level2 === formData.level2)
                .map(acc => acc.level3)
        );
        return Array.from(uniqueLevel3).sort();
    }, [accounts, formData.level2]);
    
    // --- Automatic ID Generation ---

    useEffect(() => {
        if (!isEditMode && formData.level3) {
            const level3PrefixMatch = formData.level3.match(/^(\d+)-/);
            if (level3PrefixMatch) {
                const prefix = level3PrefixMatch[1];
                const siblingAccounts = accounts.filter(acc => acc.id.startsWith(prefix));
                
                let nextIdNumber = 0;
                if (siblingAccounts.length > 0) {
                    const maxId = Math.max(...siblingAccounts.map(acc => {
                        const num = parseInt(acc.id, 10);
                        return isNaN(num) ? 0 : num;
                    }));
                    nextIdNumber = maxId + 1;
                } else {
                    // Start with '1' if it's a 3-digit prefix, '01' if 2-digit etc. to make it 4 digits.
                    // This is a simplification, assumes 4-digit IDs.
                    nextIdNumber = parseInt(prefix.padEnd(3, '0') + '1', 10);
                }
                
                setFormData(prev => ({ ...prev, id: nextIdNumber.toString() }));
            }
        }
    }, [formData.level3, accounts, isEditMode]);


    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'level1') {
            setFormData({ ...formData, level1: value, level2: '', level3: '', id: '', name: '' });
        } else if (name === 'level2') {
            setFormData({ ...formData, level2: value, level3: '', id: '', name: '' });
        } else if (name === 'level3') {
            setFormData({ ...formData, level3: value, id: '', name: '' });
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (isEditMode) {
            if (!formData.name) {
                setError('科目名稱不能為空。');
                return;
            }
            dispatch({ type: 'UPDATE_ACCOUNT', payload: formData });
            onClose();
            return;
        }

        if (!formData.id || !formData.name || !formData.level3) {
            setError('請完成所有層級的選擇並填寫科目名稱。');
            return;
        }

        if (accounts.some(acc => acc.id === formData.id)) {
            setError(`科目編號 ${formData.id} 已存在，請修改。`);
            return;
        }

        dispatch({ type: 'ADD_ACCOUNT', payload: formData });
        onClose();
    };

    const inputClass = "bg-stone-800 border border-stone-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2.5 placeholder-stone-400 disabled:opacity-50 disabled:bg-stone-800";

    return (
        <Modal isOpen={true} onClose={onClose} title={isEditMode ? '編輯會計科目' : '新增會計科目'}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    {isEditMode ? (
                        <>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-stone-200">科目編號</label>
                                <input type="text" value={formData.id} readOnly className={inputClass} />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-stone-200">科目名稱</label>
                                <input type="text" name="name" value={formData.name} onChange={handleTextChange} className={inputClass} />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-stone-200">科目層級</label>
                                <p className="text-sm p-2.5 text-stone-400">{formData.level1} &gt; {formData.level2} &gt; {formData.level3}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-stone-200">一階科目</label>
                                <select name="level1" value={formData.level1} onChange={handleSelectChange} className={inputClass}>
                                    <option value="">選擇一階科目</option>
                                    {level1Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block mb-2 text-sm font-medium text-stone-200">二階科目</label>
                                <select name="level2" value={formData.level2} onChange={handleSelectChange} className={inputClass} disabled={!formData.level1}>
                                    <option value="">選擇二階科目</option>
                                    {level2Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block mb-2 text-sm font-medium text-stone-200">三階科目</label>
                                <select name="level3" value={formData.level3} onChange={handleSelectChange} className={inputClass} disabled={!formData.level2}>
                                    <option value="">選擇三階科目</option>
                                    {level3Options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <hr className="border-stone-700" />
                            <div>
                                <label className="block mb-2 text-sm font-medium text-stone-200">科目編號 (自動產生)</label>
                                <input
                                    type="text"
                                    name="id"
                                    value={formData.id}
                                    onChange={handleTextChange}
                                    disabled={!formData.level3}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-stone-200">科目名稱</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleTextChange}
                                    disabled={!formData.level3}
                                    className={inputClass}
                                />
                            </div>
                        </>
                    )}
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
                <div className="flex justify-end mt-6 space-x-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-stone-200 bg-stone-800 border border-stone-600 rounded-lg hover:bg-stone-700">
                        取消
                    </button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:ring-4 focus:outline-none focus:ring-amber-800">
                        儲存
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AccountForm;