import { createBrowserRouter, Navigate } from 'react-router-dom'
import AddEmailLoginPage from '../pages/AddEmailLoginPage'
import AppLayout from '../layouts/AppLayout'
import AdminLoginPage from '../pages/AdminLoginPage'
import AdminLayout from '../features/admin/AdminLayout'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import AdminFaqEditPage from '../pages/admin/AdminFaqEditPage'
import AdminFaqListPage from '../pages/admin/AdminFaqListPage'
import AdminMonitoringPage from '../pages/admin/AdminMonitoringPage'
import AdminQualityPage from '../pages/admin/AdminQualityPage'
import AdminStoreEditPage from '../pages/admin/AdminStoreEditPage'
import AdminStoresPage from '../pages/admin/AdminStoresPage'
import AdminSystemPage from '../pages/admin/AdminSystemPage'
import ChatPage from '../pages/ChatPage'
import EmailLoginPage from '../pages/EmailLoginPage'
import FaqPage from '../pages/FaqPage'
import IntroPage from '../pages/IntroPage'
import NotificationsPage from '../pages/NotificationsPage'
import MyPage from '../pages/MyPage'
import MyPlanPage from '../pages/MyPlanPage'
import PlanSelectPage from '../pages/PlanSelectPage'
import OnboardingPage from '../pages/OnboardingPage'
import OAuthCallbackPage from '../pages/OAuthCallbackPage'
import Placeholder from '../pages/Placeholder'
import SettingsPage from '../pages/SettingsPage'
import SignupPage from '../pages/SignupPage'
import SocialMatchPage from '../pages/SocialMatchPage'
import StoreDetailPage from '../pages/StoreDetailPage'
import StoreRegionPage from '../pages/StoreRegionPage'
import StoresPage from '../pages/StoresPage'

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      // 메인과 대화는 같은 채팅 화면. 첫 질문을 보내면 /chat/:sessionId로 바뀐다
      { path: '/', element: <ChatPage /> },
      { path: '/chat/:sessionId', element: <ChatPage /> },
      // 매장: 지도 + 목록 → 지역으로 찾기 · 매장 상세
      { path: '/stores', element: <StoresPage /> },
      { path: '/stores/region', element: <StoreRegionPage /> },
      { path: '/stores/:storeId', element: <StoreDetailPage /> },
      // 자주 묻는 질문. ?id=로 오면 그 FAQ를 맨 위에 펼친다
      { path: '/faq', element: <FaqPage /> },
      { path: '/my', element: <MyPage /> },
      // 알림: 다른 화면에 있을 때 도착한 답변 (TELME-192)
      { path: '/my/notifications', element: <NotificationsPage /> },
      // 요금제: 내 요금제(약정·정지·해지) · 가입/변경할 요금제 고르기 (로그인 회원만)
      { path: '/my/plan', element: <MyPlanPage /> },
      { path: '/my/plan/select', element: <PlanSelectPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/terms', element: <Placeholder title="이용약관" note="내용 준비 중" /> },
      { path: '/privacy', element: <Placeholder title="개인정보처리방침" note="내용 준비 중" /> },
    ],
  },
  // 하단 메뉴 없는 화면
  { path: '/auth/login', element: <EmailLoginPage /> },
  { path: '/auth/signup', element: <SignupPage /> },
  { path: '/settings/email-login', element: <AddEmailLoginPage /> },
  { path: '/oauth/callback', element: <OAuthCallbackPage /> },
  // 소셜 로그인 중 같은 이메일 계정이 있을 때 (MEMBER409-1)
  { path: '/auth/social-match', element: <SocialMatchPage /> },
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/intro', element: <IntroPage /> },
  // 관리자 (전용 로그인 페이지)
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'quality', element: <AdminQualityPage /> },
      { path: 'faqs', element: <AdminFaqListPage /> },
      { path: 'faqs/new', element: <AdminFaqEditPage /> },
      { path: 'faqs/:faqId', element: <AdminFaqEditPage /> },
      { path: 'stores', element: <AdminStoresPage /> },
      { path: 'stores/new', element: <AdminStoreEditPage /> },
      { path: 'stores/:storeId', element: <AdminStoreEditPage /> },
      { path: 'system', element: <AdminSystemPage /> },
      { path: 'monitoring', element: <AdminMonitoringPage /> },
      { path: '*', element: <Navigate to="/admin/dashboard" replace /> },
    ],
  },
  { path: '*', element: <Placeholder title="페이지를 찾을 수 없어요" /> },
])
