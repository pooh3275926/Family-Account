import React, { useState } from 'react';
import { CreditCardLedger, CreditCardTransaction } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import Modal from '../ui/Modal';
import { Upload, AlertCircle } from 'lucide-react';

interface CreditCardBulkImportModalProps {
    ledger: CreditCardLedger;
    onClose: () => void;
}

const CreditCardBulkImportModal: React.FC<CreditCardBulkImportModalProps> = ({ ledger, onClose }) => {
    const { state, dispatch } = useAppContext();
    const { accounts } = state;
    const [pastedData, setPastedData] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const validAccountIds = new Set(accounts.filter(a => a.id.startsWith('5') || a.id.startsWith('6') || a.id.startsWith('7')).map(a => a.id));

    const handleImport = () => {
        setIsProcessing(true);
        setError(null);

        const lines = pastedData.trim().split('\n');
        const newTransactions: CreditCardTransaction[] = [];
        const errors: string[] = [];

        lines.forEach((line, index) => {
            if (!line.trim()) return;
            
            const parts = line.split(',');
            if (parts.length < 3 || parts.length > 4) {
                errors.push(`第 ${index + 1} 行: 格式不正確，應有 3 或 4 個欄位。`);
                return;
            }

            const [date, description, amountStr, accountId = ''] = parts.map(p => p.trim());
            const amount = parseFloat(amountStr);

            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.push(`第 ${index + 1} 行: 日期格式錯誤 (應為 YYYY-MM-DD)。`);
            if (isNaN(amount)) errors.push(`第 ${index + 1} 行: 金額必須是數字。`);
            if (accountId && !validAccountIds.has(accountId)) errors.push(`第 ${index + 1} 行: 費用科目 ID "${accountId}" 不存在。`);
            
            if (errors.length > 0) return;

            newTransactions.push({
                id: `${Date.now()}-${index}`,
                date,
                description,
                amount,
                accountId: accountId || undefined,
            });
        });

        if (errors.length > 0) {
            setError(errors.join('\n'));
            setIsProcessing(false);
            return;
        }

        const updatedLedger = {
            ...ledger,
            transactions: [...ledger.transactions, ...newTransactions].sort((a,b) => b.date.localeCompare(a.date)),
        };

        dispatch({ type: 'UPDATE_CREDIT_CARD_LEDGER', payload: updatedLedger });
        
        setIsProcessing(false);
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`快速寫入至 ${ledger.name}`} size="lg">
            <div className="space-y-4">
                <div>
                    <div className="text-xs text-stone-400 mb-2 p-3 bg-stone-800 rounded-lg">
                        <p>請貼上交易資料。每一行代表一筆交易，欄位之間請用 <strong>半形逗號</strong> 分隔。</p>
                        <p className="font-semibold mt-1">格式: <strong>日期 (YYYY-MM-DD)</strong>,<strong>描述</strong>,<strong>金額</strong>,<strong>費用科目ID (選填)</strong></p>
                    </div>
                    <textarea
                        rows={10}
                        className="bg-stone-950 border border-stone-700 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-2.5 placeholder-stone-400 font-mono"
                        placeholder="2024-08-01,晚餐,350,6219&#10;2024-08-02,停車費,50,6314"
                        value={pastedData}
                        onChange={(e) => setPastedData(e.target.value)}
                        disabled={isProcessing}
                    />
                </div>
                {error && (
                    <div className="p-4 text-sm text-red-400 rounded-lg bg-red-900/20" role="alert">
                         <div className="flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span className="font-medium">匯入錯誤！</span>
                        </div>
                        <pre className="mt-2 whitespace-pre-wrap text-xs font-mono bg-stone-900 p-2 rounded">{error}</pre>
                    </div>
                )}
                <div className="flex justify-end pt-2 space-x-2">
                     <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm font-medium text-stone-200 bg-stone-800 border border-stone-600 rounded-lg hover:bg-stone-700"
                    >
                        關閉
                    </button>
                    <button 
                        onClick={handleImport} 
                        disabled={isProcessing || !pastedData}
                        className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 focus:ring-4 focus:outline-none focus:ring-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Upload size={18} className="mr-2" />
                        {isProcessing ? '處理中...' : '匯入'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CreditCardBulkImportModal;