/**
 * PUBLIC CONFIG
 * GitHub에 공개되어도 되는 정보만 둡니다.
 */
const CONFIG = {
  useCurtain: true,

  wedding: {
    date: "2026-12-26",
    time: "14:00",
    venue: "가천컨벤션센터",

    // 오시는 길 섹션 표시용
    locationName: "가천컨벤션센터",
    hall: "가천대학교 글로벌캠퍼스 비전타워 5층",
    address: "경기도 성남시 수정구 성남대로 1342",
    tel: "",

    mapLinks: {
      kakao: "https://map.kakao.com/?q=%EA%B0%80%EC%B2%9C%EC%BB%A8%EB%B2%A4%EC%85%98%EC%84%BC%ED%84%B0",

      // Android / PC / fallback
      naver: "https://m.map.naver.com/search2/search.naver?query=%EA%B0%80%EC%B2%9C%EC%BB%A8%EB%B2%A4%EC%85%98%EC%84%BC%ED%84%B0",

      // iOS Safari: 네이버지도 앱에 정확한 위치 마커 전달
      naverIOS: "nmap://place?lat=37.45008&lng=127.12718&name=%EA%B0%80%EC%B2%9C%EC%BB%A8%EB%B2%A4%EC%85%98%EC%84%BC%ED%84%B0&appname=https%3A%2F%2Flimuju4135-cyber.github.io%2Fdyywwd1226%2F"
    }
  },

  greeting: {
    title: "소중한 분들을 초대합니다",
    content: "서로 다른 길을 걸어온 두 사람이\n이제 같은 길을 함께 걸어가려 합니다.\n\n저희의 새로운 시작을\n축복해 주시면 감사하겠습니다."
  },

  // 아래 값은 Private R2에서 로딩
  groom: {},
  bride: {},

  accounts: {
    groom: [],
    bride: []
  },

  meta: {
    title: "2026.12.26. 도영♡여울의 결혼식에 초대합니다.",
    description: "12월 26일 오후 2시, 가천컨벤션센터에서 소중한 분들을 초대합니다."
  }
};
