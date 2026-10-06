/**
 * 시·도와 법정동코드 앞 2자리. 지역 검색(GET /stores/region)의 region 값으로 쓴다.
 * 백엔드 매장 데이터(공공데이터 2026-06)와 같은 코드라서 광주·전남은 통합 코드(12) 하나다.
 * 시·군·구는 여기 두지 않고, 그 시·도의 매장에서 뽑는다(useDistricts).
 */
export interface Sido {
  code: string
  /** 버튼에 쓰는 짧은 이름 */
  label: string
  name: string
}

export const SIDO_LIST: Sido[] = [
  { code: '11', label: '서울', name: '서울특별시' },
  { code: '41', label: '경기', name: '경기도' },
  { code: '28', label: '인천', name: '인천광역시' },
  { code: '26', label: '부산', name: '부산광역시' },
  { code: '27', label: '대구', name: '대구광역시' },
  { code: '30', label: '대전', name: '대전광역시' },
  { code: '31', label: '울산', name: '울산광역시' },
  { code: '36', label: '세종', name: '세종특별자치시' },
  { code: '51', label: '강원', name: '강원특별자치도' },
  { code: '43', label: '충북', name: '충청북도' },
  { code: '44', label: '충남', name: '충청남도' },
  { code: '52', label: '전북', name: '전북특별자치도' },
  { code: '12', label: '전남광주', name: '전남광주통합특별시' },
  { code: '47', label: '경북', name: '경상북도' },
  { code: '48', label: '경남', name: '경상남도' },
  { code: '50', label: '제주', name: '제주특별자치도' },
]

/** 처음 들어왔을 때 보여 줄 지역 */
export const DEFAULT_SIDO = SIDO_LIST[0]

export const sidoOf = (code: string) => SIDO_LIST.find((s) => s.code === code.slice(0, 2))
