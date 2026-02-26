// サーバーサイドページネーションの共通型定義

export interface PaginationParams {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface ServerTableState {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  totalCount: number;
  totalPages: number;
}
