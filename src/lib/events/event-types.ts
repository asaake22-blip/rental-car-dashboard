/**
 * ドメインイベント型定義
 *
 * Discriminated union でイベントの型安全性を保証。
 * 新しいイベントを追加する際はここに型を追加する。
 */

import type { Vehicle, LeaseContract, VehicleInspection, Office, Payment, PaymentAllocation, PaymentTerminal, Reservation, Invoice, Account, Quotation } from "@/generated/prisma/client";

/** ドメインイベントの共通型 */
export type DomainEvent =
  | { type: "vehicle.created"; payload: { vehicle: Vehicle; userId: string } }
  | { type: "vehicle.updated"; payload: { vehicle: Vehicle; userId: string } }
  | { type: "vehicle.deleted"; payload: { id: string; userId: string } }
  | { type: "lease.created"; payload: { lease: LeaseContract; userId: string } }
  | { type: "lease.terminated"; payload: { lease: LeaseContract; userId: string } }
  | { type: "inspection.completed"; payload: { inspection: VehicleInspection; userId: string } }
  | { type: "office.created"; payload: { office: Office; userId: string } }
  | { type: "office.updated"; payload: { office: Office; userId: string } }
  | { type: "office.deleted"; payload: { id: string; userId: string } }
  | { type: "payment.created"; payload: { payment: Payment; userId: string } }
  | { type: "payment.updated"; payload: { payment: Payment; userId: string } }
  | { type: "payment.deleted"; payload: { payment: Payment; userId: string } }
  | { type: "payment.allocated"; payload: { payment: Payment; allocation: PaymentAllocation; userId: string } }
  | { type: "terminal.created"; payload: { terminal: PaymentTerminal; userId: string } }
  | { type: "terminal.updated"; payload: { terminal: PaymentTerminal; userId: string } }
  | { type: "terminal.deleted"; payload: { terminal: PaymentTerminal; userId: string } }
  | { type: "reservation.created"; payload: { reservation: Reservation; userId: string } }
  | { type: "reservation.updated"; payload: { reservation: Reservation; userId: string } }
  | { type: "reservation.cancelled"; payload: { reservation: Reservation; userId: string } }
  | { type: "reservation.vehicleAssigned"; payload: { reservation: Reservation; userId: string } }
  | { type: "reservation.departed"; payload: { reservation: Reservation; userId: string } }
  | { type: "reservation.returned"; payload: { reservation: Reservation; userId: string } }
  | { type: "reservation.settled"; payload: { reservation: Reservation; userId: string } }
  | { type: "reservation.approved"; payload: { reservation: Reservation; userId: string } }
  | { type: "reservation.rejected"; payload: { reservation: Reservation; userId: string } }
  | { type: "invoice.created"; payload: { invoice: Invoice; userId: string } }
  | { type: "invoice.updated"; payload: { invoice: Invoice; userId: string } }
  | { type: "invoice.issued"; payload: { invoice: Invoice; userId: string } }
  | { type: "invoice.paid"; payload: { invoice: Invoice; userId: string } }
  | { type: "invoice.cancelled"; payload: { invoice: Invoice; userId: string } }
  | { type: "invoice.overdue"; payload: { invoice: Invoice; userId: string } }
  | { type: "account.created"; payload: { account: Account; userId: string } }
  | { type: "account.updated"; payload: { account: Account; userId: string } }
  | { type: "account.deleted"; payload: { id: string; userId: string } }
  | { type: "quotation.created"; payload: { quotation: Quotation; userId: string } }
  | { type: "quotation.updated"; payload: { quotation: Quotation; userId: string } }
  | { type: "quotation.sent"; payload: { quotation: Quotation; userId: string } }
  | { type: "quotation.accepted"; payload: { quotation: Quotation; userId: string } }
  | { type: "quotation.rejected"; payload: { quotation: Quotation; userId: string } }
  | { type: "quotation.converted"; payload: { quotation: Quotation; reservationId: string; userId: string } };

/** イベントタイプの文字列リテラル */
export type EventType = DomainEvent["type"];

/** 特定イベントタイプの payload 型を取得 */
export type EventPayload<T extends EventType> = Extract<DomainEvent, { type: T }>["payload"];
