/**
 * PUBLIC CONFIG
 *
 * GitHub에 공개되어도 되는 정보만 둡니다.
 * 이름 / 혼주명 / 연락처 / 계좌번호는 Private R2에서 로딩합니다.
 */
const CONFIG = {
  useCurtain: true,

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

  // 아래 데이터는 secure-loader.js가 Private R2에서 받은 값으로 채웁니다.
  groom: {},
  bride: {},
  accounts: {
    groom: [],
    bride: []
  },

  meta: {
    title: "2026.12.26 | 저희 결혼합니다",
    description: "12월 26일 오후 2시, 가천대컨벤션에서 소중한 분들을 초대합니다."
  }
};
