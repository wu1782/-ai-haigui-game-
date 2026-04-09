import { memo } from 'react'

/**
 * 骨架屏基础组件
 */
export const Skeleton = memo(function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
})

/**
 * 故事卡片骨架屏
 */
export const StoryCardSkeleton = memo(function StoryCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="rounded-2xl overflow-hidden bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* 顶部彩色条 */}
      <Skeleton className="h-1.5 w-full" />

      <div className="p-5">
        {/* 标题区 */}
        <div className="flex items-start justify-between mb-3">
          <Skeleton className="h-6 w-24 rounded" />
        </div>

        {/* 标题 */}
        <Skeleton className="h-5 w-3/4 rounded mb-3" />

        {/* 难度星级 */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="w-4 h-4 rounded" />
            ))}
          </div>
          <Skeleton className="h-5 w-12 rounded" />
        </div>

        {/* 描述 */}
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/6 rounded" />
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <Skeleton className="h-6 w-12 rounded" />
            <Skeleton className="h-6 w-12 rounded" />
          </div>
          <Skeleton className="h-5 w-16 rounded" />
        </div>
      </div>
    </div>
  )
})

/**
 * 故事卡片列表骨架屏
 */
export const StoryCardListSkeleton = memo(function StoryCardListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }, (_, i) => (
        <StoryCardSkeleton key={i} index={i} />
      ))}
    </div>
  )
})

/**
 * 好友卡片骨架屏
 */
export const FriendCardSkeleton = memo(function FriendCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 flex items-center justify-between"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-4">
        {/* 头像 */}
        <Skeleton className="w-12 h-12 rounded-full" />
        <div>
          <Skeleton className="h-5 w-24 rounded mb-2" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      </div>
      <Skeleton className="h-9 w-16 rounded-xl" />
    </div>
  )
})

/**
 * 排行榜条目骨架屏
 */
export const LeaderboardItemSkeleton = memo(function LeaderboardItemSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl border bg-white/80 dark:bg-dark-800/80 border-gray-200/50 dark:border-dark-700/50"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* 排名 */}
      <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-full" />

      {/* 玩家信息 */}
      <div className="flex-1 min-w-0">
        <Skeleton className="h-5 w-32 rounded mb-2" />
        <Skeleton className="h-4 w-48 rounded" />
      </div>

      {/* 数值 */}
      <div className="text-right">
        <Skeleton className="h-6 w-16 rounded mb-1" />
        <Skeleton className="h-3 w-12 rounded" />
      </div>
    </div>
  )
})

/**
 * 成就卡片骨架屏
 */
export const AchievementCardSkeleton = memo(function AchievementCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="p-4 rounded-2xl border bg-white/80 dark:bg-dark-800/80 border-gray-200/50 dark:border-dark-700/50 text-center"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <Skeleton className="w-14 h-14 mx-auto rounded-xl mb-3" />
      <Skeleton className="h-4 w-20 mx-auto rounded mb-2" />
      <Skeleton className="h-3 w-full rounded" />
    </div>
  )
})

/**
 * 玩家等级卡片骨架屏
 */
export const PlayerLevelCardSkeleton = memo(function PlayerLevelCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-game-500/10 to-purple-500/10 dark:from-game-500/20 dark:to-purple-500/20 rounded-2xl border border-game-500/30 p-4 overflow-hidden">
      <div className="flex items-center gap-4">
        {/* 头像 */}
        <Skeleton className="w-16 h-16 rounded-full" />

        {/* 信息 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
})

/**
 * 案例横向滚动卡片骨架屏
 */
export const CaseFileCardSkeleton = memo(function CaseFileCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="relative flex-shrink-0 w-72 bg-white dark:bg-dark-800 rounded-2xl border border-gray-200/80 dark:border-dark-700/80 p-5"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* 顶部渐变条 */}
      <Skeleton className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" />

      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      <Skeleton className="h-5 w-full rounded mb-3" />
      <Skeleton className="h-4 w-5/6 rounded mb-4" />

      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-14 rounded-lg" />
        <Skeleton className="h-5 w-12 rounded" />
      </div>
    </div>
  )
})

/**
 * 页面加载骨架屏
 */
export const PageSkeleton = memo(function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      {/* 顶部导航 */}
      <header className="bg-white/80 dark:bg-dark-800/80 border-b border-gray-200/50 dark:border-dark-700/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-xl" />
            <Skeleton className="h-6 w-32 rounded" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-10 h-10 rounded-xl" />
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* 标题 */}
        <Skeleton className="h-8 w-64 rounded mb-2" />
        <Skeleton className="h-5 w-96 rounded mb-8" />

        {/* 每日挑战 */}
        <Skeleton className="h-32 w-full rounded-2xl mb-8" />

        {/* 玩家等级卡 */}
        <PlayerLevelCardSkeleton />

        {/* 热门案例 */}
        <div className="mb-10">
          <Skeleton className="h-6 w-32 rounded mb-6" />
          <div className="flex gap-5 overflow-x-auto pb-4">
            {[1, 2, 3, 4].map(i => (
              <CaseFileCardSkeleton key={i} index={i} />
            ))}
          </div>
        </div>

        {/* 故事网格 */}
        <StoryCardListSkeleton count={9} />
      </main>
    </div>
  )
})

/**
 * 游戏页面骨架屏
 */
export const GameSkeleton = memo(function GameSkeleton() {
  return (
    <div className="h-screen bg-gray-50 dark:bg-dark-900 flex flex-col">
      {/* 顶部栏 */}
      <header className="bg-white/80 dark:bg-dark-800/80 border-b border-gray-200/50 dark:border-dark-700/50 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="h-6 w-32 rounded" />
            <Skeleton className="h-6 w-16 rounded-lg" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-20 rounded-xl" />
            <Skeleton className="h-10 w-16 rounded-xl" />
            <Skeleton className="h-10 w-16 rounded-xl" />
          </div>
        </div>
      </header>

      {/* 汤面提示 */}
      <div className="bg-game-500/5 border-b border-game-500/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-4 flex-1 rounded" />
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-20 rounded mb-2" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 输入区域 */}
      <div className="bg-white/80 dark:bg-dark-800/80 border-t border-gray-200/50 dark:border-dark-700/50 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <Skeleton className="flex-1 h-12 rounded-2xl" />
            <Skeleton className="w-24 h-12 rounded-2xl" />
          </div>
          <div className="flex items-center justify-between mt-3">
            <Skeleton className="h-3 w-48 rounded" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
