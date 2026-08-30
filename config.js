/**
 * classic-elegant 기반 커스텀 시작본
 * 이번 단계는 원본 구조 유지 + 색상 변경 + 눈송이 효과 변경만 반영한 버전입니다.
 * 실제 이름/계좌/사진은 추후 수정하면 됩니다.
 */
const CONFIG = {
  useCurtain: false,

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

  story: {
    title: "우리의 이야기",
    content: "추운 겨울 끝자락,\n서로의 온기가 되어\n하나의 계절을 함께 맞이합니다."
  },

  accounts: {
    groom: [
      { role: "신랑", name: "홍길동", bank: "은행명", number: "000-0000-0000" }
    ],
    bride: [
      { role: "신부", name: "김영희", bank: "은행명", number: "000-0000-0000" }
    ]
  }
};
