
export interface Account {
  id: string; // 科目編號
  name: string; // 科目名稱
  level1: string;
  level2: string;
  level3: string;
}

export interface JournalLine {
  accountId: string;
  memo: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string; // 傳票編號
  date: string; // yyyy-mm-dd
  lines: JournalLine[];
}

export interface CreditCardTransaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    accountId?: string; // The expense account
}

export interface CreditCardLedger {
    id: string;
    name: string; // e.g., '中信信用卡-君如'
    liabilityAccountId: string; // e.g., '2511'
    transactions: CreditCardTransaction[];
}

export interface AmortizationItem {
    id: string;
    description: string;
    totalAmount: number;
    periods: number;
    startDate: string;
    debitAccountId: string; // Expense account
    creditAccountId: string; // Prepaid/Asset account
}

export interface PrepaymentItem {
    id: string;
    date: string;
    description: string;
    amount: number;
    assetAccountId: string; // The asset account used for the prepayment
    status: 'unsettled' | 'settled';
}

export interface ReceivedPaymentItem {
    id: string;
    date: string;
    description: string;
    amount: number;
    liabilityAccountId: string; // The liability account used for the received payment
    status: 'unsettled' | 'settled';
}

export interface ManagedMemo {
  id: string;
  text: string;
}

export interface SalaryLedgerLine {
    accountId: string;
    memo: string;
}
