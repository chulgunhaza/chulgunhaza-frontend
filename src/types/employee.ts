// domain/member 열거형 그대로 매핑
export type Gender = 'MALE' | 'FEMALE';

export type Position =
  | 'EMPLOYEE'
  | 'ASSISTANT_MANAGER'
  | 'MANAGER'
  | 'DEPUTY_MANAGER'
  | 'TEAM_LEADER';

export type UserRole = 'USER' | 'MANAGER' | 'ADMIN';

export const POSITION_LABEL: Record<Position, string> = {
  EMPLOYEE: '사원',
  ASSISTANT_MANAGER: '대리',
  MANAGER: '과장',
  DEPUTY_MANAGER: '차장',
  TEAM_LEADER: '팀장',
};

export interface EmployeeImage {
  imageName: string;
  imagePath?: string;
  imageSize?: number;
  imageType?: string;
}

export interface Annual {
  totalAnnualCount: number;
  useCount: number;
  remainingAnnualCount: number;
  sickAnnualCount: number;
}

// service/impl/LoginSuccessHandler 가 실제로 세션에 담고 응답으로 돌려주는 필드만 반영
// (표준 REST 스펙이 아니라 커스텀 로그인 성공 응답이라 springdoc 문서에는 안 나옴)
export interface LoginResponse {
  message: string;
  id: number; // 원래 응답에 없던 PK — 채팅방 생성 등에 필요해서 프론트 작업 중 백엔드에 추가함
  depart: string;
  name: string;
  employeeNo: number;
  employeeRoles: UserRole[];
}

// EmployeeResponseDto
export interface EmployeeResponseDto {
  id: number;
  name: string;
  email: string;
  employeeImage: EmployeeImage;
  gender: Gender;
  department: string;
  position: Position;
  userRoleList: UserRole[];
  annual: Annual;
  version: number;
}

export interface EmployeeListResponseDto {
  id: number;
  name: string;
  email: string;
  employeeImage: EmployeeImage;
  gender: Gender;
  department: string;
  position: Position;
}

// EmployeeCreateRequestDto (JSON body — 컨트롤러가 @RequestBody 를 씀)
export interface EmployeeCreateRequestDto {
  name: string;
  email: string;
  gender: Gender;
  birthDate: string; // yyyy-MM-dd
  hireDate: string; // yyyy-MM-dd
  department: string;
  position: Position;
  userRoleList: UserRole[];
}

// EmployeeModifyRequestDto — multipart(@RequestPart)로 전송, version은 낙관적 락 체크용
export interface EmployeeModifyRequestDto {
  name: string;
  email: string;
  gender: Gender;
  birthDate: string;
  hireDate: string;
  department: string;
  position: Position;
  userRoleList: UserRole[];
  version: number;
}
