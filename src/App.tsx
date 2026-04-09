import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Toast from './components/Toast'
import LoadingOverlay from './components/LoadingOverlay'
import { ErrorBoundary } from './components/ErrorBoundary'
import AtmosphereEffects from './components/AtmosphereEffects'
import { OnboardingGuide } from './components/OnboardingGuide'

// 路由级代码分割
const Home = lazy(() => import('./pages/Home'))
const Game = lazy(() => import('./pages/Game'))
const Result = lazy(() => import('./pages/Result'))
const Custom = lazy(() => import('./pages/Custom'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const Achievements = lazy(() => import('./pages/Achievements'))
const Generate = lazy(() => import('./pages/Generate'))
const Multiplayer = lazy(() => import('./pages/Multiplayer'))
const Auth = lazy(() => import('./pages/Auth'))
const Profile = lazy(() => import('./pages/Profile'))
const Friends = lazy(() => import('./pages/Friends'))
const Replay = lazy(() => import('./pages/Replay'))
const Contribute = lazy(() => import('./pages/Contribute'))
const AdminReview = lazy(() => import('./pages/AdminReview'))

// 加载中组件 - 带动画效果
function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-light dark:bg-dark-900">
      {/* 加载动画 */}
      <div className="relative mb-6">
        <div className="w-16 h-16 border-4 border-game-200 dark:border-game-800 rounded-full" />
        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-game-500 rounded-full animate-spin" />
        <div className="absolute inset-2 w-12 h-12 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }} />
      </div>
      {/* 加载文字 */}
      <div className="text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">
        加载中
      </div>
      <div className="flex gap-1 mt-1">
        <span className="w-2 h-2 bg-game-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-game-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-light dark:bg-dark-900">
      {/* 背景氛围动效 */}
      <AtmosphereEffects />
      {/* 全局组件 */}
      <Toast />
      <LoadingOverlay />
      {/* 新手引导 */}
      <OnboardingGuide />

      {/* 全局错误边界 - 捕获任何未预期的JS错误 */}
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game/:storyId" element={<Game />} />
            <Route path="/result" element={<Result />} />
            <Route path="/custom" element={<Custom />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/multiplayer" element={<Multiplayer />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/replay/:replayId" element={<Replay />} />
            <Route path="/contribute" element={<Contribute />} />
            <Route path="/admin/review" element={<AdminReview />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

export default App
