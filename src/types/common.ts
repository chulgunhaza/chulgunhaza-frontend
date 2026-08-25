// 백엔드 PageDto<T> (dto/PageDto.java) 그대로 매핑
export interface PageDto<T> {
  contents: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
}

export interface ApiErrorBody {
  error?: string;
  message?: string;
  status?: number;
}
