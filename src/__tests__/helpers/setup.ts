/**
 * テスト用共通モック定義
 *
 * vi.hoisted で巻き上げ、vi.mock のファクトリ内から参照可能にする。
 * サービス層テストで import して使用する。
 */

import { vi } from "vitest";

function createModelMock() {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  };
}

export const mockPrisma = {
  leaseContract: createModelMock(),
  leaseContractLine: createModelMock(),
  vehicle: createModelMock(),
  payment: createModelMock(),
  paymentAllocation: createModelMock(),
  paymentTerminal: createModelMock(),
  vehicleClass: createModelMock(),
  reservation: createModelMock(),
  invoice: createModelMock(),
  invoiceLine: createModelMock(),
  ratePlan: createModelMock(),
  rateOption: createModelMock(),
  reservationOption: createModelMock(),
  account: createModelMock(),
  quotation: createModelMock(),
  quotationLine: createModelMock(),
  $transaction: vi.fn(),
};

export const mockGetCurrentUser = vi.fn();
export const mockHasRole = vi.fn();

export const mockEventBus = {
  on: vi.fn(),
  emit: vi.fn().mockResolvedValue(undefined),
};
