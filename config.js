/**
 * classic-elegant 기반 커스텀 시작본
 * 수정: 커튼 정상 작동 + 원본 스크립트 필수 meta 항목 추가
 */
const CONFIG = {
  // 초대장 열기 화면 사용
  useCurtain: true,

  groom: {
    name: "신랑",
    nameEn: "Groom",
    father: "아버지",
    mother: "어머니",
    fatherDeceased: false,
    motherDeceased: false
  },

  bride: {
    name: "신부",
    nameEn: "Bride",
    father: "아버지",
    mother: "어머니",
    fatherDeceased: false,
    motherDeceased: false
  },

  wedding: {
    date: "2026-12-26",
    time: "14:00",
    venue: "가천대컨벤션",
    hall: "",
    address: "경기도 성남시 수정구 성남대로 1342",
    tel: "",
    mapLinks: {
      kakao: "https://map.kakao.com/",
      naver: "https://map.naver.com/"
    }
  },

  greeting: {
    title: "소중한 분들을 초대합니다",
    content: "서로 다른 길을 걸어온 두 사람이\n이제 같은 길을 함께 걸어가려 합니다.\n\n저희의 새로운 시작을\n축복해 주시면 감사하겠습니다."
  },

  accounts: {
    groom: [
      { role: "신랑", name: "홍길동", bank: "은행명", number: "000-0000-0000" }
    ],
    bride: [
      { role: "신부", name: "김영희", bank: "은행명", number: "000-0000-0000" }
    ]
  },

  // 원본 classic-elegant script.js가 시작 시 반드시 읽는 항목
  meta: {
    title: "2026.12.26 | 저희 결혼합니다",
    description: "12월 26일 오후 2시, 가천대컨벤션에서 소중한 분들을 초대합니다."
  }
};
