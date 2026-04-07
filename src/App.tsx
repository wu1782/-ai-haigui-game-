import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Toast from './components/Toast'
import LoadingOverlay from './components/LoadingOverlay'

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

// 加载中组件
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-light dark:bg-dark-900">
      <div className="text-light-500 dark:text-dark-300">加载中...</div>
    </div>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-light dark:bg-dark-900">
      {/* 全局组件 */}
      <Toast />
      <LoadingOverlay />

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}

export default App
