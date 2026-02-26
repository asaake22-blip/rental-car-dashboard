/**
 * リース契約（LeaseContract/LeaseContractLine）のサービス層
 *
 * M:N 構造に対応。契約ヘッダー + 明細の CRUD と、
 * 車両ステータス管理（IN_STOCK <-> LEASED）を一元管理する。
 */

import { prisma } from "@/lib/prisma";
import { getCurrentUser, hasRole } from "@/lib/auth";
import {
  createLeaseContractSchema,
  updateLeaseContractSchema,
  addLineSchema,
  updateLineSchema,
} from "@/lib/validations/lease-contract";
import {
  ValidationError,
  NotFoundError,
  PermissionError,
} from "@/lib/errors";
import { eventBus } from "@/lib/events/event-bus";
import "@/lib/events/handlers";
import type {
  LeaseContract,
  LeaseContractLine,
  Prisma,
} from "@/generated/prisma/client";

/** Zod エラーを fieldErrors に変換 */
function toFieldErrors(
  error: { issues: { path: PropertyKey[]; message: string }[] },
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) fieldErrors[path] = [];
    fieldErrors[path].push(issue.message);
  }
  return fieldErrors;
}

/** Prisma P2002 (unique constraint violation) の判定 */
function isPrismaUniqueError(
  e: unknown,
): e is { code: string; meta?: { target?: string[] } } {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

/** 明細取得用の共通 include */
const linesInclude = {
  lines: {
    include: { vehicle: true },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.LeaseContractInclude;

/** 詳細取得用の include（車両に営業所も含む） */
const detailInclude = {
  lines: {
    include: {
      vehicle: {
        include: { office: true },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.LeaseContractInclude;

export const leaseContractService = {
  /** 契約一覧取得（ページネーション対応） */
  async list(params: {
    where?: Prisma.LeaseContractWhereInput;
    orderBy?:
      | Prisma.LeaseContractOrderByWithRelationInput
      | Prisma.LeaseContractOrderByWithRelationInput[];
    skip?: number;
    take?: number;
  }): Promise<{ data: LeaseContract[]; total: number }> {
    const [data, total] = await Promise.all([
      prisma.leaseContract.findMany({
        where: params.where,
        orderBy: params.orderBy,
        skip: params.skip,
        take: params.take,
        include: linesInclude,
      }),
      prisma.leaseContract.count({ where: params.where }),
    ]);
    return { data, total };
  },

  /** 契約詳細取得 */
  async get(id: string): Promise<LeaseContract | null> {
    return prisma.leaseContract.findUnique({
      where: { id },
      include: detailInclude,
    });
  },

  /** 契約作成（自動採番 + 明細作成 + 車両ステータス変更） */
  async create(input: unknown): Promise<LeaseContract> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const parsed = createLeaseContractSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    const data = parsed.data;

    try {
      const contract = await prisma.$transaction(async (tx) => {
        // 1. 自動採番: LC-NNNNN
        const last = await tx.leaseContract.findFirst({
          orderBy: { contractNumber: "desc" },
          select: { contractNumber: true },
        });
        const nextNum = last
          ? parseInt(last.contractNumber.replace("LC-", ""), 10) + 1
          : 1;
        const contractNumber = `LC-${String(nextNum).padStart(5, "0")}`;

        // 2. 各車両の IN_STOCK チェック
        const vehicleIds = data.lines.map((l) => l.vehicleId);
        const vehicles = await tx.vehicle.findMany({
          where: { id: { in: vehicleIds } },
          select: { id: true, status: true, plateNumber: true },
        });

        if (vehicles.length !== vehicleIds.length) {
          throw new ValidationError("指定された車両が見つかりません");
        }

        const notInStock = vehicles.filter((v) => v.status !== "IN_STOCK");
        if (notInStock.length > 0) {
          const plates = notInStock.map((v) => v.plateNumber).join(", ");
          throw new ValidationError(
            `以下の車両は在庫状態ではないためリースできません: ${plates}`,
          );
        }

        // 3. 契約 + 明細作成
        const created = await tx.leaseContract.create({
          data: {
            contractNumber,
            externalId: data.externalId ?? null,
            lesseeType: data.lesseeType,
            lesseeCompanyCode: data.lesseeCompanyCode ?? null,
            lesseeName: data.lesseeName,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            note: data.note ?? null,
            lines: {
              create: data.lines.map((line) => ({
                vehicleId: line.vehicleId,
                startDate: new Date(line.startDate),
                endDate: new Date(line.endDate),
                monthlyAmount: line.monthlyAmount,
                note: line.note ?? null,
              })),
            },
          },
          include: linesInclude,
        });

        // 4. 車両ステータスを LEASED に変更
        await tx.vehicle.updateMany({
          where: { id: { in: vehicleIds } },
          data: { status: "LEASED" },
        });

        return created;
      });

      await eventBus.emit("lease.created", {
        lease: contract,
        userId: user.id,
      });
      return contract;
    } catch (e: unknown) {
      if (e instanceof ValidationError || e instanceof PermissionError) {
        throw e;
      }
      if (isPrismaUniqueError(e)) {
        const target = e.meta?.target;
        if (target?.includes("externalId")) {
          throw new ValidationError("この外部IDは既に登録されています", {
            externalId: ["この外部IDは既に登録されています"],
          });
        }
        if (target?.includes("contractId") && target?.includes("vehicleId")) {
          throw new ValidationError(
            "同一契約に同じ車両を複数登録できません",
          );
        }
        throw new ValidationError("契約番号が重複しています");
      }
      throw e;
    }
  },

  /** 契約ヘッダー更新 */
  async update(id: string, input: unknown): Promise<LeaseContract> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.leaseContract.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundError("契約が見つかりません");
    }

    const parsed = updateLeaseContractSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    const data = parsed.data;

    try {
      const contract = await prisma.leaseContract.update({
        where: { id },
        data: {
          externalId: data.externalId ?? null,
          lesseeType: data.lesseeType,
          lesseeCompanyCode: data.lesseeCompanyCode ?? null,
          lesseeName: data.lesseeName,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          note: data.note ?? null,
        },
        include: linesInclude,
      });
      return contract;
    } catch (e: unknown) {
      if (isPrismaUniqueError(e)) {
        const target = e.meta?.target;
        if (target?.includes("externalId")) {
          throw new ValidationError("この外部IDは既に登録されています", {
            externalId: ["この外部IDは既に登録されています"],
          });
        }
        throw new ValidationError("更新時に一意制約違反が発生しました");
      }
      throw e;
    }
  },

  /** 契約削除（cascade で明細も削除、車両ステータス復帰） */
  async delete(id: string): Promise<void> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MANAGER")) {
      throw new PermissionError(
        "削除にはマネージャー以上の権限が必要です",
      );
    }

    const existing = await prisma.leaseContract.findUnique({
      where: { id },
      include: { lines: { select: { vehicleId: true } } },
    });
    if (!existing) {
      throw new NotFoundError("契約が見つかりません");
    }

    const vehicleIds = existing.lines.map((l) => l.vehicleId);

    await prisma.$transaction(async (tx) => {
      // cascade 削除（スキーマ定義で onDelete: Cascade）
      await tx.leaseContract.delete({ where: { id } });

      // 他の ACTIVE 契約に含まれていない車両のステータスを IN_STOCK に戻す
      if (vehicleIds.length > 0) {
        const stillLeasedVehicleIds = await tx.leaseContractLine.findMany({
          where: {
            vehicleId: { in: vehicleIds },
            contract: { status: "ACTIVE" },
          },
          select: { vehicleId: true },
          distinct: ["vehicleId"],
        });

        const stillLeasedSet = new Set(
          stillLeasedVehicleIds.map((v) => v.vehicleId),
        );
        const toRestore = vehicleIds.filter(
          (vid) => !stillLeasedSet.has(vid),
        );

        if (toRestore.length > 0) {
          await tx.vehicle.updateMany({
            where: { id: { in: toRestore }, status: "LEASED" },
            data: { status: "IN_STOCK" },
          });
        }
      }
    });

    await eventBus.emit("lease.terminated", {
      lease: existing as LeaseContract,
      userId: user.id,
    });
  },

  /** 契約解約（status -> TERMINATED、車両ステータス復帰） */
  async terminate(id: string): Promise<LeaseContract> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const existing = await prisma.leaseContract.findUnique({
      where: { id },
      include: { lines: { select: { vehicleId: true } } },
    });
    if (!existing) {
      throw new NotFoundError("契約が見つかりません");
    }
    if (existing.status !== "ACTIVE") {
      throw new ValidationError("アクティブな契約のみ解約できます");
    }

    const vehicleIds = existing.lines.map((l) => l.vehicleId);

    const contract = await prisma.$transaction(async (tx) => {
      const updated = await tx.leaseContract.update({
        where: { id },
        data: { status: "TERMINATED" },
        include: linesInclude,
      });

      // 他の ACTIVE 契約に含まれていない車両のステータスを IN_STOCK に戻す
      if (vehicleIds.length > 0) {
        const stillLeasedVehicleIds = await tx.leaseContractLine.findMany({
          where: {
            vehicleId: { in: vehicleIds },
            contract: { status: "ACTIVE", id: { not: id } },
          },
          select: { vehicleId: true },
          distinct: ["vehicleId"],
        });

        const stillLeasedSet = new Set(
          stillLeasedVehicleIds.map((v) => v.vehicleId),
        );
        const toRestore = vehicleIds.filter(
          (vid) => !stillLeasedSet.has(vid),
        );

        if (toRestore.length > 0) {
          await tx.vehicle.updateMany({
            where: { id: { in: toRestore }, status: "LEASED" },
            data: { status: "IN_STOCK" },
          });
        }
      }

      return updated;
    });

    await eventBus.emit("lease.terminated", {
      lease: contract,
      userId: user.id,
    });
    return contract;
  },

  /** 明細追加（車両を契約に追加） */
  async addLine(
    contractId: string,
    input: unknown,
  ): Promise<LeaseContractLine> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const contract = await prisma.leaseContract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      throw new NotFoundError("契約が見つかりません");
    }
    if (contract.status !== "ACTIVE") {
      throw new ValidationError(
        "アクティブな契約にのみ明細を追加できます",
      );
    }

    const parsed = addLineSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    const data = parsed.data;

    try {
      const line = await prisma.$transaction(async (tx) => {
        // 車両の IN_STOCK チェック
        const vehicle = await tx.vehicle.findUnique({
          where: { id: data.vehicleId },
          select: { id: true, status: true, plateNumber: true },
        });
        if (!vehicle) {
          throw new ValidationError("指定された車両が見つかりません");
        }
        if (vehicle.status !== "IN_STOCK") {
          throw new ValidationError(
            `車両 ${vehicle.plateNumber} は在庫状態ではないためリースできません`,
          );
        }

        // 明細作成
        const created = await tx.leaseContractLine.create({
          data: {
            contractId,
            vehicleId: data.vehicleId,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            monthlyAmount: data.monthlyAmount,
            note: data.note ?? null,
          },
          include: { contract: true, vehicle: true },
        });

        // 車両ステータスを LEASED に変更
        await tx.vehicle.update({
          where: { id: data.vehicleId },
          data: { status: "LEASED" },
        });

        return created;
      });

      return line;
    } catch (e: unknown) {
      if (e instanceof ValidationError || e instanceof PermissionError) {
        throw e;
      }
      if (isPrismaUniqueError(e)) {
        throw new ValidationError(
          "この車両は既にこの契約に登録されています",
          { vehicleId: ["この車両は既にこの契約に登録されています"] },
        );
      }
      throw e;
    }
  },

  /** 明細更新（月額・日付・備考の変更。車両は変更不可） */
  async updateLine(lineId: string, input: unknown): Promise<LeaseContractLine> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const line = await prisma.leaseContractLine.findUnique({
      where: { id: lineId },
      include: { contract: true },
    });
    if (!line) {
      throw new NotFoundError("明細が見つかりません");
    }
    if (line.contract.status !== "ACTIVE") {
      throw new ValidationError("アクティブな契約の明細のみ編集できます");
    }

    const parsed = updateLineSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        "入力内容に誤りがあります",
        toFieldErrors(parsed.error),
      );
    }

    const data = parsed.data;

    return prisma.leaseContractLine.update({
      where: { id: lineId },
      data: {
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        monthlyAmount: data.monthlyAmount,
        note: data.note ?? null,
      },
      include: { contract: true, vehicle: true },
    });
  },

  /** 明細削除（車両を契約から除外） */
  async removeLine(lineId: string): Promise<void> {
    const user = await getCurrentUser();
    if (!hasRole(user, "MEMBER")) {
      throw new PermissionError("権限がありません");
    }

    const line = await prisma.leaseContractLine.findUnique({
      where: { id: lineId },
      include: { contract: true },
    });
    if (!line) {
      throw new NotFoundError("明細が見つかりません");
    }

    await prisma.$transaction(async (tx) => {
      await tx.leaseContractLine.delete({ where: { id: lineId } });

      // 他の ACTIVE 契約にこの車両が含まれていなければ IN_STOCK に戻す
      const stillLeased = await tx.leaseContractLine.findFirst({
        where: {
          vehicleId: line.vehicleId,
          contract: { status: "ACTIVE" },
        },
      });

      if (!stillLeased) {
        await tx.vehicle.update({
          where: { id: line.vehicleId },
          data: { status: "IN_STOCK" },
        });
      }
    });
  },

  /** 車両別の契約明細一覧 */
  async listByVehicle(vehicleId: string): Promise<LeaseContractLine[]> {
    return prisma.leaseContractLine.findMany({
      where: { vehicleId },
      orderBy: { createdAt: "desc" },
      include: { contract: true, vehicle: true },
    });
  },

  /** 期限切れ契約の自動ステータス更新 */
  async expireOverdue(): Promise<number> {
    const now = new Date();

    const expiredContracts = await prisma.leaseContract.findMany({
      where: {
        status: "ACTIVE",
        endDate: { lt: now },
      },
      include: { lines: { select: { vehicleId: true } } },
    });

    if (expiredContracts.length === 0) return 0;

    await prisma.$transaction(async (tx) => {
      // ステータスを EXPIRED に更新
      await tx.leaseContract.updateMany({
        where: {
          id: { in: expiredContracts.map((c) => c.id) },
        },
        data: { status: "EXPIRED" },
      });

      // 各車両について他の ACTIVE 契約がなければ IN_STOCK に戻す
      const allVehicleIds = [
        ...new Set(
          expiredContracts.flatMap((c) => c.lines.map((l) => l.vehicleId)),
        ),
      ];

      if (allVehicleIds.length > 0) {
        const stillLeasedVehicleIds = await tx.leaseContractLine.findMany({
          where: {
            vehicleId: { in: allVehicleIds },
            contract: {
              status: "ACTIVE",
              id: { notIn: expiredContracts.map((c) => c.id) },
            },
          },
          select: { vehicleId: true },
          distinct: ["vehicleId"],
        });

        const stillLeasedSet = new Set(
          stillLeasedVehicleIds.map((v) => v.vehicleId),
        );
        const toRestore = allVehicleIds.filter(
          (vid) => !stillLeasedSet.has(vid),
        );

        if (toRestore.length > 0) {
          await tx.vehicle.updateMany({
            where: { id: { in: toRestore }, status: "LEASED" },
            data: { status: "IN_STOCK" },
          });
        }
      }
    });

    return expiredContracts.length;
  },
};
