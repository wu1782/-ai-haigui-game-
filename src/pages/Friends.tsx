import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import type { Friend, FriendRequest, UserSearchResult, FriendTab, Pagination } from '../types/friend'
import {
  getFriends,
  getFriendRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend
} from '../services/friendService'
import { PageTransition, FadeIn } from '../components/PageTransition'
import { PageErrorState, FriendCardSkeleton } from '../components'
import { NoFriendsEmpty, NoFriendRequestsEmpty, NoSearchResults } from '../components/EmptyState'

/**
 * Friends - 好友页面
 */
export default function Friends() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<FriendTab>('list')
  const [friends, setFriends] = useState<Friend[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchPage, setSearchPage] = useState(1)
  const [searchPagination, setSearchPagination] = useState<Pagination>({ page: 1, pages: 1, total: 0, hasMore: false })
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getFriendRequests()
      ])
      setFriends(friendsData)
      setReceivedRequests(requestsData.received)
    } catch (err) {
      console.error('加载数据失败:', err)
      setError('加载好友数据失败')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSearch = async (keyword: string) => {
    setSearchKeyword(keyword)
    setSearchPage(1) // Reset to first page on new search
    if (keyword.trim().length < 1) {
      setSearchResults([])
      setSearchPagination({ page: 1, pages: 1, total: 0, hasMore: false })
      return
    }

    setSearchLoading(true)
    try {
      const result = await searchUsers(keyword, 1)
      setSearchResults(result.users)
      setSearchPagination(result.pagination)
    } catch (error) {
      console.error('搜索失败:', error)
      showToast('搜索失败，请重试', 'error')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleLoadMoreSearch = async () => {
    if (!searchPagination.hasMore || searchLoading) return
    setSearchLoading(true)
    try {
      const result = await searchUsers(searchKeyword, searchPage + 1)
      setSearchResults(prev => [...prev, ...result.users])
      setSearchPage(prev => prev + 1)
      setSearchPagination(result.pagination)
    } catch (error) {
      console.error('加载更多失败:', error)
      showToast('加载更多失败', 'error')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSendRequest = async (toUser: { id: string; username: string; avatar?: string }) => {
    if (!user) return
    setActionLoading(toUser.id)

    const result = await sendFriendRequest(toUser.id)

    if (result.success) {
      showToast(`已发送好友请求给 ${toUser.username}`, 'success')
      handleSearch(searchKeyword)
      const requestsData = await getFriendRequests()
      setReceivedRequests(requestsData.received)
    } else {
      showToast(result.error || '发送失败，请稍后重试', 'error')
    }
    setActionLoading(null)
  }

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId)
    const result = await acceptFriendRequest(requestId)
    if (result.success) {
      showToast('已添加好友', 'success')
      loadData()
      setActiveTab('list')
    } else {
      showToast(result.error || '操作失败', 'error')
    }
    setActionLoading(null)
  }

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId)
    const result = await rejectFriendRequest(requestId)
    if (result.success) {
      loadData()
    } else {
      showToast(result.error || '操作失败', 'error')
    }
    setActionLoading(null)
  }

  const handleRemoveFriend = async (friendId: string) => {
    setActionLoading(friendId)
    const result = await removeFriend(friendId)
    if (result.success) {
      showToast('已删除好友', 'success')
      loadData()
    } else {
      showToast(result.error || '删除失败', 'error')
    }
    setActionLoading(null)
  }

  const tabs: { key: FriendTab; label: string; icon: string; count?: number }[] = [
    { key: 'list', label: '好友', icon: '👥' },
    { key: 'requests', label: '请求', icon: '📨', count: receivedRequests.length },
    { key: 'search', label: '搜索', icon: '🔍' }
  ]

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/20 to-purple-50/20 dark:from-dark-900 dark:via-game-900/10 dark:to-purple-900/10 relative overflow-hidden">
        <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50">
          <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl skeleton" />
              <div className="h-5 w-16 skeleton rounded" />
            </div>
          </div>
        </header>
        <main className="relative max-w-2xl mx-auto px-6 py-8">
          <div className="flex gap-2 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-12 skeleton rounded-xl" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <FriendCardSkeleton key={i} index={i} />
            ))}
          </div>
        </main>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <PageErrorState
        title="加载失败"
        message={error}
        onRetry={loadData}
      />
    )
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/20 to-purple-50/20 dark:from-dark-900 dark:via-game-900/10 dark:to-purple-900/10 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-game-500/10 to-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
        </div>

        {/* 顶部导航 */}
        <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50">
          <div className="max-w-2xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="group flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
                <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
                <span className="text-sm font-medium hidden sm:inline">返回</span>
              </Link>
              <div className="h-8 w-px bg-gray-200 dark:bg-dark-700 hidden sm:block" />
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">好友</h1>
            </div>
          </div>
        </header>

        {/* 主内容 */}
        <main className="relative max-w-2xl mx-auto px-6 py-8">
          {/* 标签切换 */}
          <FadeIn>
            <div className="flex gap-2 mb-8 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl p-2 border border-gray-200/50 dark:border-dark-700/50 shadow-lg">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-game-500 to-purple-600 text-white shadow-lg'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      activeTab === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </FadeIn>

          {/* 好友列表 */}
          {activeTab === 'list' && (
            <FadeIn delay={100}>
              <div className="space-y-4">
                {friends.length === 0 ? (
                  <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50">
                    <NoFriendsEmpty onSearch={() => setActiveTab('search')} />
                  </div>
                ) : (
                  friends.map((friend, index) => (
                    <div
                      key={friend.id}
                      className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 flex items-center justify-between hover:border-game-500/30 transition-all shadow-sm hover:shadow-md animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <Avatar src={friend.avatar} username={friend.username} size="lg" isOnline={friend.status === 'online'} />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">{friend.username}</p>
                          <p className="text-sm text-gray-500">
                            {friend.status === 'online' ? (
                              <span className="text-emerald-500">在线</span>
                            ) : (
                              <span>离线</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        disabled={actionLoading === friend.id}
                        className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50 font-medium"
                      >
                        {actionLoading === friend.id ? '删除中...' : '删除'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </FadeIn>
          )}

          {/* 好友请求 */}
          {activeTab === 'requests' && (
            <FadeIn delay={100}>
              <div className="space-y-4">
                {receivedRequests.length === 0 ? (
                  <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50">
                    <NoFriendRequestsEmpty />
                  </div>
                ) : (
                  receivedRequests.map((request, index) => (
                    <div
                      key={request.id}
                      className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 shadow-sm animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Avatar src={request.fromUser.avatar} username={request.fromUser.username} size="lg" />
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{request.fromUser.username}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleAccept(request.id)}
                          disabled={actionLoading === request.id}
                          className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-sm"
                        >
                          {actionLoading === request.id ? '处理中...' : '接受'}
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={actionLoading === request.id}
                          className="flex-1 py-3 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-dark-600 disabled:opacity-50 transition-all"
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </FadeIn>
          )}

          {/* 搜索添加好友 */}
          {activeTab === 'search' && (
            <FadeIn delay={100}>
              <div>
                {/* 搜索框 */}
                <div className="mb-6 relative">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="搜索用户名..."
                    className="w-full px-5 py-4 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-dark-700/50 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20 transition-all shadow-sm"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                </div>

                {/* 搜索结果 */}
                {searchLoading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-4 border-4 border-game-500/20 border-t-game-500 rounded-full animate-spin" />
                    <p className="text-gray-500">搜索中...</p>
                  </div>
                ) : searchResults.length === 0 && searchKeyword.trim().length > 0 ? (
                  <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50">
                    <NoSearchResults keyword={searchKeyword} />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.map((result, index) => (
                      <div
                        key={result.id}
                        className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all animate-fade-in-up"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <Avatar src={result.avatar} username={result.username} size="lg" />
                          <p className="font-bold text-gray-900 dark:text-white">{result.username}</p>
                        </div>
                        <div>
                          {result.isFriend ? (
                            <span className="px-4 py-2 text-sm text-emerald-500 bg-emerald-500/10 rounded-xl font-medium">
                              已是好友
                            </span>
                          ) : result.hasSentRequest ? (
                            <span className="px-4 py-2 text-sm text-amber-500 bg-amber-500/10 rounded-xl font-medium">
                              已发送
                            </span>
                          ) : result.hasReceivedRequest ? (
                            <span className="px-4 py-2 text-sm text-blue-500 bg-blue-500/10 rounded-xl font-medium">
                              待接受
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendRequest({
                                id: result.id,
                                username: result.username,
                                avatar: result.avatar
                              })}
                              disabled={actionLoading === result.id}
                              className="px-5 py-2.5 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700 text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-sm"
                            >
                              {actionLoading === result.id ? '添加中...' : '添加'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* 加载更多按钮 */}
                    {searchPagination.hasMore && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={handleLoadMoreSearch}
                          disabled={searchLoading}
                          className="px-6 py-3 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all disabled:opacity-50"
                        >
                          {searchLoading ? (
                            <span className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                              加载中...
                            </span>
                          ) : (
                            `加载更多 (${searchPagination.total - searchResults.length} 条剩余)`
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
                      <span className="text-4xl">🔍</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">输入用户名搜索好友</p>
                  </div>
                )}
              </div>
            </FadeIn>
          )}
        </main>
      </div>
    </PageTransition>
  )
}
