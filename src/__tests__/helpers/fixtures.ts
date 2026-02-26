/**
 * テスト用フィクスチャ
 *
 * Prisma モデルと同構造のダミーデータ。
 * テスト専用のため @/generated/prisma/client には依存しない。
 */

import type { CurrentUser } from "@/lib/auth";

// --- ユーザー ---

export const adminUser: CurrentUser = {
  id: "test-admin-001",
  email: "admin@test.com",
  name: "テスト管理者",
  role: "ADMIN",
};

export const managerUser: CurrentUser = {
  id: "test-manager-001",
  email: "manager@test.com",
  name: "テストマネージャー",
  role: "MANAGER",
};

export const memberUser: CurrentUser = {
  id: "test-member-001",
  email: "member@test.com",
  name: "テストメンバー",
  role: "MEMBER",
};

// --- LeaseContract ---

export const sampleLeaseContract = {
  id: "lease-001",
  contractNumber: "LC-00001",
  externalId: "EXT-LC-001",
  lesseeType: "CORPORATE",
  lesseeCompanyCode: "C001",
  lesseeName: "テストリース会社",
  startDate: new Date("2025-04-01"),
  endDate: new Date("2026-03-31"),
  status: "ACTIVE" as const,
  note: null,
  createdAt: new Date("2025-03-15"),
  updatedAt: new Date("2025-03-15"),
  lines: [],
};

export const sampleVehicle = {
  id: "vehicle-001",
  vehicleCode: "VH-00001",
  plateNumber: "品川 500 あ 1234",
  status: "IN_STOCK" as const,
  vehicleClass: "普通乗用車",
  maker: "トヨタ",
  model: "プリウス",
  modelYear: 2024,
  registrationDate: new Date("2024-01-15"),
  officeId: "office-001",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const sampleLeaseContractLine = {
  id: "line-001",
  contractId: "lease-001",
  vehicleId: "vehicle-001",
  startDate: new Date("2025-04-01"),
  endDate: new Date("2026-03-31"),
  monthlyAmount: 50000,
  note: null,
  createdAt: new Date("2025-03-15"),
  updatedAt: new Date("2025-03-15"),
  contract: sampleLeaseContract,
  vehicle: sampleVehicle,
};

export const validLeaseContractInput = {
  externalId: "EXT-LC-002",
  lesseeType: "CORPORATE",
  lesseeCompanyCode: "C002",
  lesseeName: "テストリース会社2",
  startDate: "2025-05-01",
  endDate: "2026-04-30",
  note: null,
  lines: [
    {
      vehicleId: "vehicle-001",
      startDate: "2025-05-01",
      endDate: "2026-04-30",
      monthlyAmount: 60000,
      note: null,
    },
  ],
};

export const validLeaseLineInput = {
  vehicleId: "vehicle-002",
  startDate: "2025-05-01",
  endDate: "2026-04-30",
  monthlyAmount: 55000,
  note: null,
};

// --- Payment ---

export const samplePayment = {
  id: "payment-001",
  paymentNumber: "PM-00001",
  paymentDate: new Date("2025-05-01"),
  amount: 110000,
  paymentCategory: "BANK_TRANSFER" as const,
  paymentProvider: null,
  payerName: "テスト入金者",
  terminalId: null,
  terminal: null,
  externalId: null,
  note: null,
  status: "UNALLOCATED" as const,
  allocations: [],
  createdAt: new Date("2025-05-01"),
  updatedAt: new Date("2025-05-01"),
};

export const samplePaymentAllocation = {
  id: "alloc-001",
  paymentId: "payment-001",
  reservationId: "reservation-001",
  invoiceId: null,
  allocatedAmount: 110000,
  createdAt: new Date("2025-05-01"),
  updatedAt: new Date("2025-05-01"),
};

export const samplePaymentTerminal = {
  id: "terminal-001",
  terminalCode: "TM-00001",
  terminalName: "マルチ端末A",
  terminalType: "MULTI" as const,
  provider: "Square",
  modelName: "Square Reader",
  serialNumber: "SN-123456",
  officeId: "office-001",
  status: "ACTIVE" as const,
  note: null,
  createdAt: new Date("2025-05-01"),
  updatedAt: new Date("2025-05-01"),
};

export const validPaymentInput = {
  paymentDate: "2025-05-01",
  amount: 110000,
  paymentCategory: "BANK_TRANSFER" as const,
  paymentProvider: null,
  payerName: "テスト入金者",
  terminalId: null,
  externalId: null,
  note: null,
};

export const validAllocationInput = {
  reservationId: "reservation-001",
  allocatedAmount: 110000,
};

export const validTerminalInput = {
  terminalName: "マルチ端末A",
  terminalType: "MULTI" as const,
  provider: "Square",
  modelName: "Square Reader",
  serialNumber: "SN-123456",
  officeId: "office-001",
  note: null,
};

// --- VehicleClass ---

export const sampleVehicleClass = {
  id: "vc-1",
  classCode: "CL-00001",
  className: "コンパクト",
  description: "コンパクトカー（フィット、ヴィッツ等）",
  sortOrder: 1,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const validVehicleClassInput = {
  className: "ミニバン",
  description: "ミニバン（セレナ、ヴォクシー等）",
  sortOrder: 3,
};

// --- Reservation ---

export const sampleReservation = {
  id: "reservation-001",
  reservationCode: "RS-00001",
  status: "RESERVED" as const,
  vehicleClassId: "vc-1",
  vehicleId: null,
  accountId: null,
  customerName: "テスト顧客",
  customerNameKana: "テストコキャク",
  customerPhone: "03-1234-5678",
  customerEmail: null,
  pickupDate: new Date("2026-03-01T09:00:00"),
  returnDate: new Date("2026-03-03T18:00:00"),
  pickupOfficeId: "office-001",
  returnOfficeId: "office-001",
  actualPickupDate: null,
  actualReturnDate: null,
  departureOdometer: null,
  returnOdometer: null,
  estimatedAmount: 15000,
  actualAmount: null,
  note: null,
  customerCode: null,
  entityType: 1,
  companyCode: null,
  channel: "WEB",
  taxAmount: null,
  settledAt: null,
  revenueDate: null,
  approvalStatus: "APPROVED" as const,
  approvedById: null,
  approvedAt: null,
  approvalComment: null,
  createdAt: new Date("2026-02-15"),
  updatedAt: new Date("2026-02-15"),
};

export const validReservationInput = {
  vehicleClassId: "vc-1",
  customerName: "テスト顧客",
  customerNameKana: "テストコキャク",
  customerPhone: "03-1234-5678",
  customerEmail: "",
  pickupDate: "2026-03-01T09:00:00",
  returnDate: "2026-03-03T18:00:00",
  pickupOfficeId: "office-001",
  returnOfficeId: "office-001",
  estimatedAmount: 15000,
  note: null,
};

// --- Invoice ---

export const sampleInvoice = {
  id: "invoice-001",
  invoiceNumber: "IV-00001",
  reservationId: "reservation-001",
  accountId: null,
  customerName: "テスト法人",
  customerCode: "CUST-001",
  companyCode: "C001",
  issueDate: new Date("2026-03-05"),
  dueDate: new Date("2026-03-31"),
  amount: 15000,
  taxAmount: 1500,
  totalAmount: 16500,
  status: "DRAFT" as const,
  paidAt: null,
  note: null,
  externalId: null,
  externalUrl: null,
  externalStatus: null,
  syncedAt: null,
  lines: [],
  createdAt: new Date("2026-03-05"),
  updatedAt: new Date("2026-03-05"),
};

export const validInvoiceInput = {
  reservationId: "reservation-001",
  customerName: "テスト法人",
  customerCode: "CUST-001",
  companyCode: "C001",
  issueDate: "2026-03-05",
  dueDate: "2026-03-31",
  amount: 15000,
  taxAmount: 1500,
  totalAmount: 16500,
};

// --- Account ---

export const sampleAccount = {
  id: "account-001",
  accountCode: "AC-00001",
  accountName: "テスト法人株式会社",
  accountNameKana: "テストホウジンカブシキガイシャ",
  accountType: "CORPORATE" as const,
  closingDay: 31,
  paymentMonthOffset: 1,
  paymentDay: null,
  paymentTermsLabel: "月末締め翌月末払い",
  mfPartnerId: null,
  mfPartnerCode: null,
  syncedAt: null,
  zipCode: "100-0001",
  address: "東京都千代田区...",
  phone: "03-1111-2222",
  email: "info@test-corp.co.jp",
  legacyCompanyCode: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

export const validAccountInput = {
  accountName: "新規法人株式会社",
  accountNameKana: "シンキホウジンカブシキガイシャ",
  accountType: "CORPORATE" as const,
  closingDay: 31,
  paymentMonthOffset: 1,
  paymentTermsLabel: "月末締め翌月末払い",
};

// --- Quotation ---

export const sampleQuotation = {
  id: "quotation-001",
  quotationCode: "QT-00001",
  accountId: "account-001",
  status: "DRAFT" as const,
  title: "レンタカー見積書",
  customerName: "テスト法人株式会社",
  vehicleClassId: "vc-1",
  pickupDate: new Date("2026-04-01T09:00:00"),
  returnDate: new Date("2026-04-03T18:00:00"),
  pickupOfficeId: "office-001",
  returnOfficeId: "office-001",
  amount: 15000,
  taxAmount: 1500,
  totalAmount: 16500,
  validUntil: new Date("2026-04-30"),
  note: null,
  reservationId: null,
  createdAt: new Date("2026-03-01"),
  updatedAt: new Date("2026-03-01"),
};

export const sampleQuotationLine = {
  id: "qline-001",
  quotationId: "quotation-001",
  sortOrder: 0,
  description: "コンパクトカー（3日間）",
  quantity: 1,
  unitPrice: 15000,
  amount: 15000,
  taxRate: 0.10,
  taxAmount: 1500,
  createdAt: new Date("2026-03-01"),
  updatedAt: new Date("2026-03-01"),
};

export const validQuotationInput = {
  accountId: "account-001",
  customerName: "テスト法人株式会社",
  vehicleClassId: "vc-1",
  pickupDate: "2026-04-01T09:00:00",
  returnDate: "2026-04-03T18:00:00",
  pickupOfficeId: "office-001",
  returnOfficeId: "office-001",
  lines: [
    { description: "コンパクトカー（3日間）", quantity: 1, unitPrice: 15000, taxRate: 0.10 },
  ],
};

// --- InvoiceLine ---

export const sampleInvoiceLine = {
  id: "iline-001",
  invoiceId: "invoice-001",
  sortOrder: 0,
  description: "コンパクトカー（3日間）",
  quantity: 1,
  unitPrice: 15000,
  amount: 15000,
  taxRate: 0.10,
  taxAmount: 1500,
  createdAt: new Date("2026-03-05"),
  updatedAt: new Date("2026-03-05"),
};
