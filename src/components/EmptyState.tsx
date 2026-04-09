import { type ReactNode, memo } from 'react'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    icon?: string
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  children?: ReactNode
  className?: string
}

/**
 * 空状态组件 - 用于列表为空时显示
 */
export const EmptyState = memo(function EmptyState({
  icon = '📭',
  title,
  description,
  action,
  secondaryAction,
  children,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`text-center py-16 px-6 ${className}`}>
      {/* 图标 */}
      <div className="relative inline-flex items-center justify-center mb-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-700 dark:to-dark-800 flex items-center justify-center">
          <span className="text-4xl">{icon}</span>
        </div>
      </div>

      {/* 标题 */}
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>

      {/* 描述 */}
      {description && (
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}

      {/* 自定义内容 */}
      {children && (
        <div className="mb-6">{children}</div>
      )}

      {/* 操作按钮 */}
      {action && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={action.onClick}
            className="px-6 py-3 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-game-500/30 transition-all active:scale-95 inline-flex items-center justify-center gap-2"
          >
            {action.icon && <span>{action.icon}</span>}
            <span>{action.label}</span>
          </button>

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-6 py-3 bg-white/80 dark:bg-dark-800/80 hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl border border-gray-200 dark:border-dark-700 transition-all inline-flex items-center justify-center gap-2"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
})

/**
 * 预定义空状态类型
 */

// 无好友
export const NoFriendsEmpty = memo(function NoFriendsEmpty({ onSearch }: { onSearch?: () => void }) {
  return (
    <EmptyState
      icon="👥"
      title="还没有好友"
      description="添加好友开始互动，或者看看谁是在线的"
      action={onSearch ? {
        label: '搜索好友',
        onClick: onSearch,
        icon: '🔍'
      } : undefined}
    />
  )
})

// 无好友请求
export const NoFriendRequestsEmpty = memo(function NoFriendRequestsEmpty() {
  return (
    <EmptyState
      icon="📭"
      title="暂无好友请求"
      description="当有人添加你为好友时，这里会显示"
    />
  )
})

// 无成就解锁
export const NoAchievementsEmpty = memo(function NoAchievementsEmpty() {
  return (
    <EmptyState
      icon="🏆"
      title="还没有解锁成就"
      description="完成游戏挑战，解锁更多成就来展示你的实力"
    />
  )
})

// 成就全部解锁
export const AllAchievementsUnlockedEmpty = memo(function AllAchievementsUnlockedEmpty() {
  return (
    <EmptyState
      icon="🎉"
      title="全部成就已解锁"
      description="太厉害了！你已经解锁了所有成就"
    />
  )
})

// 空排行榜
export const EmptyLeaderboard = memo(function EmptyLeaderboard({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyState
      icon="📊"
      title="暂无排行榜数据"
      description="完成游戏挑战，你就有机会上榜"
      action={onRefresh ? {
        label: '刷新',
        onClick: onRefresh,
        icon: '🔄'
      } : undefined}
    />
  )
})

// 搜索无结果
export const NoSearchResults = memo(function NoSearchResults({ keyword }: { keyword: string }) {
  return (
    <EmptyState
      icon="🔍"
      title="未找到用户"
      description={`没有找到与 "${keyword}" 相关的用户`}
    />
  )
})

// 无故事
export const NoStoriesEmpty = memo(function NoStoriesEmpty({ filter }: { filter?: string }) {
  const message = filter === 'unplayed'
    ? '已全部挑战完成！太厉害了！🎉'
    : '暂无故事'

  return (
    <EmptyState
      icon="🐢"
      title={message}
      description={filter === 'unplayed' ? '去看看其他故事吧' : '稍后再来看看新故事'}
    />
  )
})

// 无房间
export const NoRoomsEmpty = memo(function NoRoomsEmpty({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon="🔍"
      title="暂无房间"
      description="创建一个房间开始多人游戏吧"
      action={onCreate ? {
        label: '创建房间',
        onClick: onCreate,
        icon: '➕'
      } : undefined}
    />
  )
})

// 无回放
export const NoReplaysEmpty = memo(function NoReplaysEmpty() {
  return (
    <EmptyState
      icon="📼"
      title="暂无回放"
      description="完成游戏后可以查看回放"
    />
  )
})

// 网络错误
export const NetworkErrorEmpty = memo(function NetworkErrorEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon="📡"
      title="网络连接失败"
      description="请检查网络连接后重试"
      action={onRetry ? {
        label: '重试',
        onClick: onRetry,
        icon: '🔄'
      } : undefined}
    />
  )
})
