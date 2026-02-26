/**
 * @deprecated このファイルは lease-contract.ts に移行済みです。
 * 新しいスキーマは lease-contract.ts を参照してください。
 */
export {
  createLeaseContractSchema as createLeaseSchema,
  updateLeaseContractSchema as updateLeaseSchema,
  leaseContractLineSchema,
  leaseContractFormFields as leaseFormFields,
  type CreateLeaseContractInput as CreateLeaseInput,
  type LeaseContractLineInput,
} from "./lease-contract";
