/**
 * 料金計算エンジン（純粋関数）
 *
 * 外部依存なし。テストしやすい設計。
 */

export interface RateCalcInput {
  rateType: "HOURLY" | "DAILY" | "OVERNIGHT";
  basePrice: number;
  additionalHourPrice: number;
  insurancePrice: number;
  pickupDate: Date;
  returnDate: Date;
  options?: { price: number; quantity: number }[];
}

export interface RateCalcResult {
  baseFee: number;
  additionalFee: number;
  insuranceFee: number;
  optionsFee: number;
  totalAmount: number;
  days: number;
  hours: number;
}

/**
 * 料金計算
 *
 * - HOURLY: 6時間単位。basePrice は6時間分。超過は additionalHourPrice × 超過時間
 * - DAILY: 24時間単位。basePrice は1日分。超過は additionalHourPrice × 超過時間
 * - OVERNIGHT: 泊数制。basePrice は1泊分。日数 = ceil(差分 / 24h)
 */
export function calculateRate(input: RateCalcInput): RateCalcResult {
  const diffMs = input.returnDate.getTime() - input.pickupDate.getTime();
  if (diffMs <= 0) {
    return { baseFee: 0, additionalFee: 0, insuranceFee: 0, optionsFee: 0, totalAmount: 0, days: 0, hours: 0 };
  }

  const totalHours = diffMs / 3600000;
  const days = Math.ceil(totalHours / 24);

  let baseFee = 0;
  let additionalFee = 0;

  switch (input.rateType) {
    case "HOURLY": {
      // 6時間単位
      const baseHours = 6;
      baseFee = input.basePrice;
      const overHours = Math.max(0, Math.ceil(totalHours) - baseHours);
      additionalFee = overHours * input.additionalHourPrice;
      break;
    }
    case "DAILY": {
      // 24時間単位
      baseFee = input.basePrice * days;
      const fullDayHours = days * 24;
      const overHours = Math.max(0, Math.ceil(totalHours) - fullDayHours);
      additionalFee = overHours * input.additionalHourPrice;
      break;
    }
    case "OVERNIGHT": {
      // 泊数制
      baseFee = input.basePrice * days;
      break;
    }
  }

  const insuranceFee = input.insurancePrice * Math.max(days, 1);

  const optionsFee = (input.options ?? []).reduce(
    (sum, opt) => sum + opt.price * opt.quantity,
    0,
  );

  const totalAmount = baseFee + additionalFee + insuranceFee + optionsFee;

  return {
    baseFee,
    additionalFee,
    insuranceFee,
    optionsFee,
    totalAmount,
    days,
    hours: Math.ceil(totalHours),
  };
}
