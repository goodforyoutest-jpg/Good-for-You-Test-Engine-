import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const supportedLocales = ["en", "ja", "ko"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

const resources = {
  en: {
    translation: {
      appName: "Lingua Studio",
      tagline: "Immersive learning, structured levels, real progress.",
      ctaStart: "Start learning",
      ctaLogin: "Log in",
      ctaSignup: "Create account",
      nav: {
        dashboard: "Dashboard",
        catalog: "Courses",
        progress: "Progress",
        recommendations: "Path",
        community: "Community",
        challenges: "Challenges",
        profile: "Profile",
        admin: "Admin",
      },
      auth: {
        titleLogin: "Welcome back",
        titleSignup: "Create your account",
        email: "Email",
        password: "Password",
        displayName: "Display name",
        submitLogin: "Log in",
        submitSignup: "Sign up",
        logout: "Log out",
        demoHint: "Demo mode stores session locally until Firebase is enabled.",
      },
      onboarding: {
        title: "Set up your learning path",
        uiLanguage: "UI language",
        targetLanguage: "Learning language",
        level: "Current level",
        goal: "Primary goal",
        save: "Save and continue",
      },
      common: {
        comingSoon: "Coming soon",
      },
    },
  },
  ja: {
    translation: {
      appName: "Lingua Studio",
      tagline: "没入型学習 × レベル設計 × 進捗が見える。",
      ctaStart: "学習を始める",
      ctaLogin: "ログイン",
      ctaSignup: "新規登録",
      nav: {
        dashboard: "ダッシュボード",
        catalog: "コース",
        progress: "進捗",
        recommendations: "学習ルート",
        community: "コミュニティ",
        challenges: "チャレンジ",
        profile: "プロフィール",
        admin: "管理",
      },
      auth: {
        titleLogin: "おかえりなさい",
        titleSignup: "アカウント作成",
        email: "メール",
        password: "パスワード",
        displayName: "表示名",
        submitLogin: "ログイン",
        submitSignup: "登録する",
        logout: "ログアウト",
        demoHint: "Firebase有効化まではローカルにセッションを保存します。",
      },
      onboarding: {
        title: "学習ルートを設定",
        uiLanguage: "表示言語",
        targetLanguage: "学習言語",
        level: "現在のレベル",
        goal: "主な目的",
        save: "保存して続ける",
      },
      common: {
        comingSoon: "近日公開",
      },
    },
  },
  ko: {
    translation: {
      appName: "Lingua Studio",
      tagline: "몰입형 학습 · 레벨 체계 · 확실한 성장.",
      ctaStart: "학습 시작",
      ctaLogin: "로그인",
      ctaSignup: "회원가입",
      nav: {
        dashboard: "대시보드",
        catalog: "코스",
        progress: "진도",
        recommendations: "학습 경로",
        community: "커뮤니티",
        challenges: "챌린지",
        profile: "프로필",
        admin: "관리자",
      },
      auth: {
        titleLogin: "다시 오신 것을 환영합니다",
        titleSignup: "계정 만들기",
        email: "이메일",
        password: "비밀번호",
        displayName: "표시 이름",
        submitLogin: "로그인",
        submitSignup: "가입하기",
        logout: "로그아웃",
        demoHint: "Firebase를 활성화하기 전까지 세션은 로컬에 저장됩니다.",
      },
      onboarding: {
        title: "학습 경로 설정",
        uiLanguage: "UI 언어",
        targetLanguage: "학습 언어",
        level: "현재 레벨",
        goal: "주요 목표",
        save: "저장하고 계속",
      },
      common: {
        comingSoon: "준비 중",
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;

