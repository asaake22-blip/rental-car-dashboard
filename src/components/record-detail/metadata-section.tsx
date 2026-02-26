/**
 * メタデータ表示コンポーネント
 *
 * レコードの作成/更新日時、承認情報を表示する。
 */

import { FieldDisplay } from "./field-display";
import { DetailSection } from "./detail-section";

interface MetadataSectionProps {
  createdAt: Date;
  updatedAt: Date;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  approvedById?: string | null;
  approvedAt?: Date | null;
  approvalComment?: string | null;
}

export function MetadataSection({
  createdAt,
  updatedAt,
  approvalStatus,
  approvedById,
  approvedAt,
  approvalComment,
}: MetadataSectionProps) {
  return (
    <DetailSection title="管理情報">
      <FieldDisplay label="作成日時" value={createdAt.toLocaleString("ja-JP")} />
      <FieldDisplay label="更新日時" value={updatedAt.toLocaleString("ja-JP")} />

      {approvalStatus !== "PENDING" && (
        <>
          <FieldDisplay label="承認者ID" value={approvedById} />
          <FieldDisplay
            label="承認日時"
            value={approvedAt ? approvedAt.toLocaleString("ja-JP") : null}
          />
        </>
      )}

      {approvalComment && (
        <div className="sm:col-span-2">
          <FieldDisplay label="承認コメント" value={approvalComment} />
        </div>
      )}
    </DetailSection>
  );
}
