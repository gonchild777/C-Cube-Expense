
export enum ExpenseStatus {
  SUBMITTED = '待審核 (剛提交)',
  COMPANY_APPROVED = '公司已核准 (內部保留款)',
  NCKU_LOGGED = '已登錄成大系統 (送件中)',
  NCKU_APPROVED = '成大已核准 (已扣款)',
  NCKU_PAID = '成大已撥款 (結案)',
  REJECTED = '需補件/退回'
}

export enum ProjectType {
  NSTC = '國科會計畫', // Strict rules
  INDUSTRY = '產學合作', // Flexible
  DEPARTMENT = '系所經費' // General
}

export enum PaymentMethod {
  ADVANCE = '先行代墊', // Employee paid first
  DIRECT = '逕付廠商'   // Pay directly to vendor
}

export interface BudgetAdjustment {
  id: string;
  date: string;
  amount: number; // Positive = Increase Spent (Decrease Remaining), Negative = Refund
  reason: string;
  user: string;
}

export interface Project {
  id: string;
  name: string;
  code: string; // Accounting code e.g., 112-2221-E-006...
  type: ProjectType;
  budget: number;
  categoryBudgets?: Record<string, number>; // Specific budget limit per category
  remaining: number; // calculated field
  pending: number;   // Amount reserved by Company Approved/Logged expenses
  spent: number;     // Amount actually consumed by NCKU Approved/Paid + Manual Adjustments
  allowedCategories: string[]; // List of allowed categories
  adjustments: BudgetAdjustment[]; // History of manual corrections
}

export interface InvoiceItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  amount: number; // calculated unitPrice * quantity
}

export interface Expense {
  id: string;
  projectId: string;
  category: string;
  date: string; // Invoice date
  invoiceNumber?: string; // Optional now
  
  // Payment Details
  paymentMethod: PaymentMethod;
  payerName?: string; // If ADVANCE
  vendorTaxId?: string; // If DIRECT (Unified Business No.)

  // Items
  items: InvoiceItem[];
  totalAmount: number; // Sum of items

  status: ExpenseStatus;
  notes: string[]; // History of comments
  requiresPurchaseRequest: boolean; // Flag for > 15000 rule
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}
