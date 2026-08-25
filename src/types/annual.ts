// domain/annual/AnnualType — dayCost는 백엔드 enum에 박혀 있는 값이라 여기도 그대로 미러링
export type AnnualType = 'ANNUAL' | 'ANNUAL_AM' | 'ANNUAL_PM';

export const ANNUAL_TYPE_LABEL: Record<AnnualType, string> = {
  ANNUAL: '연차 (1일)',
  ANNUAL_AM: '오전 반차 (0.5일)',
  ANNUAL_PM: '오후 반차 (0.5일)',
};

export interface AnnualUsageRequestDto {
  annualDate: string; // yyyy-MM-dd
  annualType: AnnualType;
  annualReason?: string;
}

export interface AnnualUsageResponseDto {
  annualRecordId: number;
  totalAnnualCount: number;
  useCount: number;
  remainingAnnualCount: number;
}
