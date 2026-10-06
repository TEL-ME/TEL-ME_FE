import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import AdminLoginPage from '../pages/AdminLoginPage'
import AdminLayout from '../features/admin/AdminLayout'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import AdminFaqEditPage from '../pages/admin/AdminFaqEditPage'
import AdminFaqListPage from '../pages/admin/AdminFaqListPage'
import AdminQualityPage from '../pages/admin/AdminQualityPage'
import AdminStoreEditPage from '../pages/admin/AdminStoreEditPage'
import AdminStoresPage from '../pages/admin/AdminStoresPage'
import AdminSystemPage from '../pages/admin/AdminSystemPage'
import ChatPage from '../pages/ChatPage'
import EmailLoginPage from '../pages/EmailLoginPage'
import IntroPage from '../pages/IntroPage'
import MyPage from '../pages/MyPage'
import OnboardingPage from '../pages/OnboardingPage'
import OAuthCallbackPage from '../pages/OAuthCallbackPage'
import Placeholder from '../pages/Placeholder'
import SettingsPage from '../pages/SettingsPage'
import SignupPage from '../pages/SignupPage'
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
      { path: '/my', element: <MyPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/terms', element: <Placeholder title="이용약관" note="내용 준비 중" /> },
      { path: '/privacy', element: <Placeholder title="개인정보처리방침" note="내용 준비 중" /> },
    ],
  },
  // 하단 메뉴 없는 화면
  { path: '/auth/login', element: <EmailLoginPage /> },
  { path: '/auth/signup', element: <SignupPage /> },
  { path: '/oauth/callback', element: <OAuthCallbackPage /> },
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
      { path: '*', element: <Navigate to="/admin/dashboard" replace /> },
    ],
  },
  { path: '*', element: <Placeholder title="페이지를 찾을 수 없어요" /> },
])
