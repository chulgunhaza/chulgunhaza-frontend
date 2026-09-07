export interface Category {
  categoryName: string;
}

export interface PostCreateRequestDto {
  title: string; // 10~255자
  content: string; // 100~1000자
  categoryName: string;
}

export interface PostModifyRequestDto {
  title: string;
  content: string;
  categoryName: string;
}

export interface PostSearchResponseDto {
  title: string;
  content: string;
  author: string | null; // #59: Post-Employee 연동 이전 게시글은 null일 수 있음
  imageList: string[];
  count: number;
  category: Category;
  pinned: boolean; // 관리자 백로그 Epic 5 — 공지 고정
}

export interface PostListResponseDto {
  postNumber: number; // 백엔드에 원래 없어서 프론트 작업 중 추가함
  title: string;
  author: string | null;
  count: number;
  createdAt: string;
  pinned: boolean;
}
