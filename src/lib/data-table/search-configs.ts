// 各モデルの検索対象カラム定義

export const searchConfigs = {
  order: {
    searchableColumns: [
      "reservationKey",
      "borrowerNameKanji",
      "borrowerNameKana",
      "customerCode",
      "companyCode",
    ],
  },
  sale: {
    searchableColumns: [
      "reservationKey",
      "customerName",
      "customerNameKana",
      "customerCode",
      "salesStore",
    ],
  },
  company: {
    searchableColumns: [
      "customerCompanyCode",
      "officialName",
      "shortName",
      "companyNameKana",
    ],
  },
  customer: {
    searchableColumns: [
      "departmentCustomerCode",
      "departmentCustomerName",
      "departmentCustomerNameKana",
      "shortName",
      "customerCompanyCode",
    ],
  },
  salesRepAssignment: {
    searchableColumns: [
      "salesRepName",
      "clientName",
      "storeName",
      "officeName",
      "customerCode",
    ],
  },
  reservationTarget: {
    searchableColumns: ["clientName", "storeName", "officeName"],
  },
  salesTarget: {
    searchableColumns: ["clientName", "storeName", "officeName"],
  },
  vehicle: {
    searchableColumns: ["vehicleCode", "plateNumber", "vin", "maker", "modelName", "color"],
  },
  leaseContract: {
    searchableColumns: ["contractNumber", "lesseeName", "lesseeCompanyCode", "externalId"],
  },
  inspection: {
    searchableColumns: ["note"],
  },
  office: {
    searchableColumns: ["officeName", "area"],
  },
  payment: {
    searchableColumns: ["paymentNumber", "payerName", "paymentProvider"],
  },
  terminal: {
    searchableColumns: ["terminalCode", "terminalName", "serialNumber"],
  },
  vehicleClass: {
    searchableColumns: ["classCode", "className"],
  },
  reservation: {
    searchableColumns: ["reservationCode", "customerName", "customerNameKana", "customerPhone"],
  },
  ratePlan: {
    searchableColumns: ["planName"],
  },
  rateOption: {
    searchableColumns: ["optionName"],
  },
  invoice: {
    searchableColumns: ["invoiceNumber", "customerName", "customerCode", "companyCode"],
  },
  account: {
    searchableColumns: ["accountCode", "accountName", "accountNameKana", "phone"],
  },
  quotation: {
    searchableColumns: ["quotationCode", "customerName"],
  },
} as const;

/**
 * 検索語から Prisma の where 条件 (OR) を生成する
 */
export function buildSearchWhere(
  search: string,
  columns: readonly string[]
): Record<string, unknown> | undefined {
  if (!search) return undefined;
  return {
    OR: columns.map((col) => ({
      [col]: { contains: search, mode: "insensitive" },
    })),
  };
}
