import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { Account, JournalEntry, CreditCardLedger, AmortizationItem, PrepaymentItem, ReceivedPaymentItem, ManagedMemo, SalaryLedgerLine, UserProfile } from '../types';
import { INITIAL_ACCOUNTS } from '../constants';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_FILE_NAME = 'accounting_app_backup.json';

declare global {
    interface Window {
        gapi: any;
        google: any;
        tokenClient: any;
    }
}

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

interface ProfileData {
    accounts: Account[];
    journalEntries: JournalEntry[];
    creditCardLedgers: CreditCardLedger[];
    amortizationItems: AmortizationItem[];
    prepaymentItems: PrepaymentItem[];
    receivedPaymentItems: ReceivedPaymentItem[];
    managedMemos: ManagedMemo[];
    salaryLedger: SalaryLedgerLine[];
}

const initialProfileData: ProfileData = {
    accounts: INITIAL_ACCOUNTS,
    journalEntries: [],
    creditCardLedgers: [],
    amortizationItems: [],
    prepaymentItems: [],
    receivedPaymentItems: [],
    managedMemos: [],
    salaryLedger: DEFAULT_SALARY_LEDGER,
};

interface AppState {
    isLoading: boolean;
    googleUser: any | null;
    profiles: UserProfile[];
    activeProfileId: string | null;
    data: { [key: string]: ProfileData };
}

const initialState: AppState = {
    isLoading: true,
    googleUser: null,
    profiles: [],
    activeProfileId: null,
    data: {},
};

type Action =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_GOOGLE_USER'; payload: any | null }
    | { type: 'SET_STATE_FROM_BACKUP'; payload: { profiles: UserProfile[]; data: { [key: string]: ProfileData } } }
    | { type: 'ADD_PROFILE'; payload: UserProfile }
    | { type: 'SELECT_PROFILE'; payload: string | null }
    | { type: 'LOGOUT' }
    | { type: 'SET_PROFILE_STATE'; payload: ProfileData }
    | { type: 'ADD_ACCOUNT'; payload: Account }
    | { type: 'UPDATE_ACCOUNT'; payload: Account }
    | { type: 'DELETE_ACCOUNT'; payload: string }
    | { type: 'ADD_JOURNAL_ENTRY'; payload: JournalEntry }
    | { type: 'UPDATE_JOURNAL_ENTRY'; payload: JournalEntry }
    | { type: 'DELETE_JOURNAL_ENTRY'; payload: string }
    | { type: 'MERGE_JOURNAL_ENTRIES'; payload: JournalEntry[] }
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
    | { type: 'UPDATE_SALARY_LEDGER', payload: SalaryLedgerLine[] }
    | { type: 'RESET_SALARY_LEDGER' };

const appReducer = (state: AppState, action: Action): AppState => {
    const { activeProfileId } = state;
    const activeData = activeProfileId ? state.data[activeProfileId] : null;

    const updateActiveProfileData = (changes: Partial<ProfileData>): AppState => {
        if (!activeProfileId || !activeData) return state;
        return {
            ...state,
            data: {
                ...state.data,
                [activeProfileId]: { ...activeData, ...changes }
            }
        };
    };

    switch (action.type) {
        case 'SET_LOADING': return { ...state, isLoading: action.payload };
        case 'SET_GOOGLE_USER': return { ...state, googleUser: action.payload };
        case 'SET_STATE_FROM_BACKUP': return { ...state, ...action.payload, activeProfileId: null };
        case 'ADD_PROFILE':
            const newProfileId = action.payload.id;
            return {
                ...state,
                profiles: [...state.profiles, action.payload],
                data: { ...state.data, [newProfileId]: initialProfileData },
                activeProfileId: newProfileId,
            };
        case 'SELECT_PROFILE': return { ...state, activeProfileId: action.payload };
        case 'LOGOUT': return { ...initialState, isLoading: false };
        case 'SET_PROFILE_STATE': return updateActiveProfileData(action.payload);
        case 'ADD_ACCOUNT': if (!activeData) return state; return updateActiveProfileData({ accounts: [...activeData.accounts, action.payload] });
        case 'UPDATE_ACCOUNT': if (!activeData) return state; return updateActiveProfileData({ accounts: activeData.accounts.map(acc => acc.id === action.payload.id ? action.payload : acc) });
        case 'DELETE_ACCOUNT': if (!activeData) return state; return updateActiveProfileData({ accounts: activeData.accounts.filter(acc => acc.id !== action.payload) });
        case 'ADD_JOURNAL_ENTRY': if (!activeData) return state; return updateActiveProfileData({ journalEntries: [...activeData.journalEntries, action.payload].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)) });
        case 'UPDATE_JOURNAL_ENTRY': if (!activeData) return state; return updateActiveProfileData({ journalEntries: activeData.journalEntries.map(entry => entry.id === action.payload.id ? action.payload : entry).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)) });
        case 'DELETE_JOURNAL_ENTRY': if (!activeData) return state; return updateActiveProfileData({ journalEntries: activeData.journalEntries.filter(entry => entry.id !== action.payload) });
        case 'MERGE_JOURNAL_ENTRIES': if (!activeData) return state; const existingIds = new Set(activeData.journalEntries.map(entry => entry.id)); const newEntries = action.payload.filter(entry => !existingIds.has(entry.id)); if (newEntries.length === 0) return state; return updateActiveProfileData({ journalEntries: [...activeData.journalEntries, ...newEntries].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)) });
        case 'UPDATE_MEMOS_BY_ACCOUNT': if (!activeData) return state; const { accountId, oldMemo, newMemo } = action.payload; const updatedJournalEntries = activeData.journalEntries.map(entry => ({ ...entry, lines: entry.lines.map(line => line.accountId === accountId && line.memo === oldMemo ? { ...line, memo: newMemo } : line) })); return updateActiveProfileData({ journalEntries: updatedJournalEntries });
        case 'ADD_CREDIT_CARD_LEDGER': if (!activeData) return state; return updateActiveProfileData({ creditCardLedgers: [...activeData.creditCardLedgers, action.payload] });
        case 'UPDATE_CREDIT_CARD_LEDGER': if (!activeData) return state; return updateActiveProfileData({ creditCardLedgers: activeData.creditCardLedgers.map(l => l.id === action.payload.id ? action.payload : l) });
        case 'DELETE_CREDIT_CARD_LEDGER': if (!activeData) return state; return updateActiveProfileData({ creditCardLedgers: activeData.creditCardLedgers.filter(l => l.id !== action.payload) });
        case 'ADD_AMORTIZATION_ITEM': if (!activeData) return state; return updateActiveProfileData({ amortizationItems: [...activeData.amortizationItems, action.payload] });
        case 'UPDATE_AMORTIZATION_ITEM': if (!activeData) return state; return updateActiveProfileData({ amortizationItems: activeData.amortizationItems.map(i => i.id === action.payload.id ? action.payload : i) });
        case 'DELETE_AMORTIZATION_ITEM': if (!activeData) return state; return updateActiveProfileData({ amortizationItems: activeData.amortizationItems.filter(i => i.id !== action.payload) });
        case 'UPDATE_SALARY_LEDGER': if (!activeData) return state; return updateActiveProfileData({ salaryLedger: action.payload });
        case 'RESET_SALARY_LEDGER': if (!activeData) return state; return updateActiveProfileData({ salaryLedger: DEFAULT_SALARY_LEDGER });
        default: return state;
    }
};

interface DataContextType {
    state: AppState;
    dispatch: React.Dispatch<Action>;
    data: ProfileData;
    activeProfile: UserProfile | null;
    googleSignIn: () => void;
    googleSignOut: () => void;
    saveToCloud: () => Promise<void>;
    restoreFromCloud: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    const initGapiClient = useCallback(() => {
        window.gapi.client.init({ apiKey: GOOGLE_API_KEY, discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'] }).catch((err:any) => console.error("Error initializing gapi client:", err));
    }, []);

    const initGsiClient = useCallback(() => {
        if (!window.google) return;
        window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (response: any) => { const userObject = JSON.parse(atob(response.credential.split('.')[1])); dispatch({ type: 'SET_GOOGLE_USER', payload: userObject }); } });
        window.tokenClient = window.google.accounts.oauth2.initTokenClient({ client_id: GOOGLE_CLIENT_ID, scope: DRIVE_SCOPES, callback: undefined });
    }, []);

    useEffect(() => {
        if (window.gapi) window.gapi.load('client', initGapiClient);
        else { const gapiInterval = setInterval(() => { if (window.gapi) { clearInterval(gapiInterval); window.gapi.load('client', initGapiClient); } }, 100); }
        if (window.google) initGsiClient();
        else { const gsiInterval = setInterval(() => { if (window.google) { clearInterval(gsiInterval); initGsiClient(); } }, 100); }
    }, [initGapiClient, initGsiClient]);

    useEffect(() => {
        try { const savedStateJSON = localStorage.getItem('accountingAppState'); if (savedStateJSON) { const savedState = JSON.parse(savedStateJSON); dispatch({ type: 'SET_STATE_FROM_BACKUP', payload: { profiles: savedState.profiles || [], data: savedState.data || {} } }); } } catch (error) { console.error("Failed to load state from localStorage", error); } finally { dispatch({ type: 'SET_LOADING', payload: false }); }
    }, []);

    useEffect(() => { try { localStorage.setItem('accountingAppState', JSON.stringify({ profiles: state.profiles, data: state.data })); } catch (error) { console.error("Failed to save state to localStorage", error); } }, [state.profiles, state.data]);

    const googleSignIn = useCallback(() => { if (window.google && window.google.accounts) window.google.accounts.id.prompt(); else alert("Google Sign-In is not ready yet. Please try again in a moment."); }, []);
    const googleSignOut = useCallback(() => { dispatch({ type: 'LOGOUT' }); }, []);

    const getFileId = async (): Promise<string | undefined> => { const response = await window.gapi.client.drive.files.list({ q: `name='${BACKUP_FILE_NAME}' and trashed=false`, fields: 'files(id, name)', spaces: 'drive' }); return response.result.files?.length > 0 ? response.result.files[0].id : undefined; };

    const saveToCloud = async () => {
    const stateToSave = { profiles: state.profiles, data: state.data };
    const content = JSON.stringify(stateToSave, null, 2);
    const blob = new Blob([content], { type: 'application/json' });

    const fileId = await getFileId();

    // 如果已經有舊檔案，先刪掉
    if (fileId) {
        await window.gapi.client.drive.files.delete({ fileId });
    }

    // 再建立新檔案
    const metadata = { name: BACKUP_FILE_NAME, mimeType: 'application/json', parents: ['root'] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    await window.gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: { uploadType: 'multipart' },
        body: form
    });
};


    const requestAccessToken = async () => new Promise((resolve, reject) => { if (!window.tokenClient) { reject(new Error("Google Token Client not initialized.")); return; } window.tokenClient.callback = (resp: any) => resp.error ? reject(resp) : resolve(resp); window.tokenClient.requestAccessToken({ prompt: '' }); });

    const handleCloudAction = async (action: () => Promise<void>) => { dispatch({ type: 'SET_LOADING', payload: true }); try { await requestAccessToken(); await action(); alert('操作成功！'); } catch (error: any) { console.error("Cloud action failed", error); alert(`操作失敗: ${error.details || error.message || '未知錯誤'}`); } finally { dispatch({ type: 'SET_LOADING', payload: false }); } };

    const restoreFromCloud = async () => { const fileId = await getFileId(); if (!fileId) throw new Error("在您的雲端硬碟找不到備份檔案。"); const response = await window.gapi.client.drive.files.get({ fileId, alt: 'media' }); const backupState = response.result; dispatch({ type: 'SET_STATE_FROM_BACKUP', payload: { profiles: backupState.profiles || [], data: backupState.data || {} } }); };

    const activeProfile = state.activeProfileId ? state.profiles.find(p => p.id === state.activeProfileId) ?? null : null;
    const data = state.activeProfileId ? state.data[state.activeProfileId] || initialProfileData : initialProfileData;

    return (
        <DataContext.Provider value={{ state, dispatch, data, activeProfile, googleSignIn, googleSignOut, saveToCloud: () => handleCloudAction(saveToCloud), restoreFromCloud: () => handleCloudAction(restoreFromCloud) }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => { const context = useContext(DataContext); if (!context) throw new Error('useData must be used within a DataProvider'); return context; };
