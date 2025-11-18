

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Account, JournalEntry, CreditCardLedger, AmortizationItem, PrepaymentItem, ReceivedPaymentItem, ManagedMemo, SalaryLedgerLine } from '../types';
import { INITIAL_ACCOUNTS } from '../constants';

const DEFAULT_SALARY_LEDGER: SalaryLedgerLine[] = [
    { accountId: '2312', memo: '信用貸款-中信' },
    { accountId: '2311', memo: '信用貸款-台新' },
    { accountId: '7211', memo: '信用貸款利息' },
    { accountId: '7211', memo: '信用貸款利息' },
    { accountId: '2413', memo: '微光-台新信用卡' },
    { accountId: '2412', memo: '微光-中信信用卡' },
    { accountId: '5133', memo: '補貼家用' },
    { accountId: '5134', memo: '水電瓦斯' },
    { accountId: '1221', memo: '微光-台新' },
    { accountId: '4111', memo: '薪資收入' },
];

interface AppState {
    accounts: Account[];
    journalEntries: JournalEntry[];
    creditCardLedgers: CreditCardLedger[];
    amortizationItems: AmortizationItem[];
    prepaymentItems: PrepaymentItem[];
    receivedPaymentItems: ReceivedPaymentItem[];
    managedMemos: ManagedMemo[];
    salaryLedger: SalaryLedgerLine[];
}

type Action =
    | { type: 'SET_STATE'; payload: AppState }
    | { type: 'ADD_ACCOUNT'; payload: Account }
    | { type: 'UPDATE_ACCOUNT'; payload: Account }
    | { type: 'DELETE_ACCOUNT'; payload: string }
    | { type: 'ADD_JOURNAL_ENTRY'; payload: JournalEntry }
    | { type: 'UPDATE_JOURNAL_ENTRY'; payload: JournalEntry }
    | { type: 'DELETE_JOURNAL_ENTRY'; payload: string }
    | { type: 'BULK_ADD_JOURNAL_ENTRIES'; payload: JournalEntry[] }
    | { type: 'ADD_CREDIT_CARD_LEDGER', payload: CreditCardLedger }
    | { type: 'UPDATE_CREDIT_CARD_LEDGER', payload: CreditCardLedger }
    | { type: 'DELETE_CREDIT_CARD_LEDGER', payload: string }
    | { type: 'ADD_AMORTIZATION_ITEM', payload: AmortizationItem }
    | { type: 'UPDATE_AMORTIZATION_ITEM', payload: AmortizationItem }
    | { type: 'DELETE_AMORTIZATION_ITEM', payload: string }
    | { type: 'ADD_PREPAYMENT_ITEM', payload: PrepaymentItem }
    | { type: 'UPDATE_PREPAYMENT_ITEM', payload: PrepaymentItem }
    | { type: 'DELETE_PREPAYMENT_ITEM', payload: string }
    | { type: 'ADD_RECEIVED_PAYMENT_ITEM', payload: ReceivedPaymentItem }
    | { type: 'UPDATE_RECEIVED_PAYMENT_ITEM', payload: ReceivedPaymentItem }
    | { type: 'DELETE_RECEIVED_PAYMENT_ITEM', payload: string }
    | { type: 'ADD_MANAGED_MEMO', payload: ManagedMemo }
    | { type: 'UPDATE_MANAGED_MEMO', payload: ManagedMemo }
    | { type: 'DELETE_MANAGED_MEMO', payload: string }
    | { type: 'UPDATE_MEMOS_BY_ACCOUNT', payload: { accountId: string; oldMemo: string; newMemo: string } }
    | { type: 'MERGE_DATA'; payload: { newAccounts: Account[]; newJournalEntries: JournalEntry[] } }
    | { type: 'UPDATE_SALARY_LEDGER', payload: SalaryLedgerLine[] }
    | { type: 'RESET_SALARY_LEDGER' };

const initialState: AppState = {
    accounts: INITIAL_ACCOUNTS,
    journalEntries: [],
    creditCardLedgers: [],
    amortizationItems: [],
    prepaymentItems: [],
    receivedPaymentItems: [],
    managedMemos: [],
    salaryLedger: DEFAULT_SALARY_LEDGER,
};

const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'SET_STATE':
            return action.payload;
        case 'ADD_ACCOUNT':
            return { ...state, accounts: [...state.accounts, action.payload] };
        case 'UPDATE_ACCOUNT':
            return {
                ...state,
                accounts: state.accounts.map(acc => acc.id === action.payload.id ? action.payload : acc),
            };
        case 'DELETE_ACCOUNT':
            return {
                ...state,
                accounts: state.accounts.filter(acc => acc.id !== action.payload),
            };
        case 'ADD_JOURNAL_ENTRY':
            return {
                ...state,
                journalEntries: [...state.journalEntries, action.payload].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
            };
        case 'UPDATE_JOURNAL_ENTRY':
            return {
                ...state,
                journalEntries: state.journalEntries.map(entry => 
                    entry.id === action.payload.id ? action.payload : entry
                ).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
            };
        case 'DELETE_JOURNAL_ENTRY':
            return {
                ...state,
                journalEntries: state.journalEntries.filter(entry => entry.id !== action.payload),
            };
        case 'BULK_ADD_JOURNAL_ENTRIES': {
            const existingIds = new Set(state.journalEntries.map(entry => entry.id));
            const newEntries = action.payload.filter(entry => !existingIds.has(entry.id));
            
            if (newEntries.length === 0) {
                return state; // No changes needed
            }
            
            return {
                ...state,
                journalEntries: [...state.journalEntries, ...newEntries]
                    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
            };
        }
        case 'UPDATE_MEMOS_BY_ACCOUNT': {
            const { accountId, oldMemo, newMemo } = action.payload;
            const updatedJournalEntries = state.journalEntries.map(entry => ({
                ...entry,
                lines: entry.lines.map(line => {
                    if (line.accountId === accountId && line.memo === oldMemo) {
                        return { ...line, memo: newMemo };
                    }
                    return line;
                }),
            }));
            return { ...state, journalEntries: updatedJournalEntries };
        }
        case 'MERGE_DATA': {
            const { newAccounts, newJournalEntries } = action.payload;
            return {
                ...state,
                accounts: [...state.accounts, ...newAccounts],
                journalEntries: [...state.journalEntries, ...newJournalEntries]
                    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
            };
        }
        case 'ADD_CREDIT_CARD_LEDGER':
            return { ...state, creditCardLedgers: [...state.creditCardLedgers, action.payload] };
        case 'UPDATE_CREDIT_CARD_LEDGER':
            return {
                ...state,
                creditCardLedgers: state.creditCardLedgers.map(l => l.id === action.payload.id ? action.payload : l),
            };
        case 'DELETE_CREDIT_CARD_LEDGER':
             return {
                ...state,
                creditCardLedgers: state.creditCardLedgers.filter(l => l.id !== action.payload),
            };
        case 'ADD_AMORTIZATION_ITEM':
            return {...state, amortizationItems: [...state.amortizationItems, action.payload]};
        case 'UPDATE_AMORTIZATION_ITEM':
            return {
                ...state,
                amortizationItems: state.amortizationItems.map(i => i.id === action.payload.id ? action.payload : i)
            };
        case 'DELETE_AMORTIZATION_ITEM':
            return {
                ...state,
                amortizationItems: state.amortizationItems.filter(i => i.id !== action.payload)
            };
        case 'ADD_PREPAYMENT_ITEM':
            return { ...state, prepaymentItems: [...state.prepaymentItems, action.payload].sort((a,b) => b.date.localeCompare(a.date)) };
        case 'UPDATE_PREPAYMENT_ITEM':
            return {
                ...state,
                prepaymentItems: state.prepaymentItems.map(i => i.id === action.payload.id ? action.payload : i)
            };
        case 'DELETE_PREPAYMENT_ITEM':
            return {
                ...state,
                prepaymentItems: state.prepaymentItems.filter(i => i.id !== action.payload)
            };
        case 'ADD_RECEIVED_PAYMENT_ITEM':
            return { ...state, receivedPaymentItems: [...state.receivedPaymentItems, action.payload].sort((a,b) => b.date.localeCompare(a.date)) };
        case 'UPDATE_RECEIVED_PAYMENT_ITEM':
            return {
                ...state,
                receivedPaymentItems: state.receivedPaymentItems.map(i => i.id === action.payload.id ? action.payload : i)
            };
        case 'DELETE_RECEIVED_PAYMENT_ITEM':
            return {
                ...state,
                receivedPaymentItems: state.receivedPaymentItems.filter(i => i.id !== action.payload)
            };
        case 'ADD_MANAGED_MEMO':
            return { ...state, managedMemos: [...state.managedMemos, action.payload] };
        case 'UPDATE_MANAGED_MEMO':
            return {
                ...state,
                managedMemos: state.managedMemos.map(memo => memo.id === action.payload.id ? action.payload : memo),
            };
        case 'DELETE_MANAGED_MEMO':
            return {
                ...state,
                managedMemos: state.managedMemos.filter(memo => memo.id !== action.payload),
            };
        case 'UPDATE_SALARY_LEDGER':
            return { ...state, salaryLedger: action.payload };
        case 'RESET_SALARY_LEDGER':
            return { ...state, salaryLedger: DEFAULT_SALARY_LEDGER };
        default:
            return state;
    }
};

interface AppContextType {
    state: AppState;
    dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    useEffect(() => {
        try {
            const savedState = localStorage.getItem('accountingAppState');
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                // Ensure initial accounts are always present, but user modifications are kept
                const accounts = parsedState.accounts || [];
                const accountIds = new Set(accounts.map((a: Account) => a.id));
                const mergedAccounts = [...accounts, ...INITIAL_ACCOUNTS.filter(a => !accountIds.has(a.id))];

                // Ensure salaryLedger exists, if not, use default
                const salaryLedger = parsedState.salaryLedger || DEFAULT_SALARY_LEDGER;
                
                dispatch({ type: 'SET_STATE', payload: {...initialState, ...parsedState, accounts: mergedAccounts, salaryLedger} });
            }
        } catch (error) {
            console.error("Failed to load state from localStorage", error);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('accountingAppState', JSON.stringify(state));
        } catch (error) {
            console.error("Failed to save state to localStorage", error);
        }
    }, [state]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};
