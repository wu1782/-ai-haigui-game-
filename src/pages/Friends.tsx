import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar'
import { useAuth } from '../hooks/useAuth'
import type { Friend, FriendRequest, UserSearchResult, FriendTab } from '../types/friend'
import {
  getFriends,
  getFriendRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend
} from '../services/friendService'

/**
 * Friends - 好友页面
 */
export default function Friends() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<FriendTab>('list')
  const [friends, setFriends] = useState<Friend[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getFriendRequests()
      ])
      setFriends(friendsData)
      setReceivedRequests(requestsData.received)
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  const handleSearch = async (keyword: string) => {
    setSearchKeyword(keyword)
    if (keyword.trim().length < 1) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const results = await searchUsers(keyword)
      setSearchResults(results)
    } catch (error) {
      console.error('搜索失败:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2000)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-game-50/20 to-purple-50/20 dark:from-dark-900 dark:via-game-900/10 dark:to-purple-900/10 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-game-500/10 to-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
      </div>

      {/* Toast 提示 */}
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl text-sm font-bold z-50 transition-all animate-scale-in shadow-xl ${
          toast.type === 'success'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
            : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* 顶部导航 */}
      <header className="relative bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-700/50">
        <div className="max-w-2xl mx-auto px-6 h-18 flex items-center justify-between">
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

        {/* 好友列表 */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {friends.length === 0 ? (
              <div className="text-center py-16 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-game-500/20 to-purple-500/20 flex items-center justify-center">
                  <span className="text-4xl">👥</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-4 font-medium">还没有好友</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-6 py-3 bg-gradient-to-r from-game-500 to-purple-600 text-white font-bold rounded-xl hover:from-game-600 hover:to-purple-700 transition-all shadow-lg"
                >
                  添加好友
                </button>
              </div>
            ) : (
              friends.map(friend => (
                <div
                  key={friend.id}
                  className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 flex items-center justify-between hover:border-game-500/30 transition-all shadow-sm hover:shadow-md"
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
                    删除
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* 好友请求 */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {receivedRequests.length === 0 ? (
              <div className="text-center py-16 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <span className="text-4xl">📭</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">暂无好友请求</p>
              </div>
            ) : (
              receivedRequests.map(request => (
                <div
                  key={request.id}
                  className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 shadow-sm"
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
                      接受
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
        )}

        {/* 搜索添加好友 */}
        {activeTab === 'search' && (
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
              <div className="text-center py-16 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
                  <span className="text-4xl">🔍</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">未找到用户</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map(result => (
                  <div
                    key={result.id}
                    className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-all"
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
                          添加
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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
        )}
      </main>
    </div>
  )
}
