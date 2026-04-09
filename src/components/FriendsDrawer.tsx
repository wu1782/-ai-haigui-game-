import { useState, useEffect, useCallback, useRef } from 'react'
import Avatar from './Avatar'
import FriendChat from './FriendChat'
import ChallengeModal from './ChallengeModal'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../context/ToastContext'
import type { Friend, FriendRequest, UserSearchResult, FriendTab } from '../types/friend'
import type { PrivateMessage } from '../types/message'
import {
  getFriends,
  getFriendRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend
} from '../services/friendService'
import {
  sendPrivateMessage as sendMsg,
  getPrivateChatHistory,
  markPrivateMessagesRead,
  getLocalChatHistory,
  saveLocalChatHistory,
  onPrivateMessage,
  offPrivateMessage,
  getLocalUnreadMessages,
  incrementUnreadCount
} from '../services/friendChatService'

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface ChatState {
  friendId: string
  friendUsername: string
  friendAvatar?: string
  messages: PrivateMessage[]
}

export default function FriendsDrawer({ isOpen, onClose }: Props) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<FriendTab>('list')
  const [friends, setFriends] = useState<Friend[]>([])
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [activeChat, setActiveChat] = useState<ChatState | null>(null)
  const [chatMessages, setChatMessages] = useState<Record<string, PrivateMessage[]>>({})
  const [challengeFriend, setChallengeFriend] = useState<Friend | null>(null)
  const activeChatRef = useRef<ChatState | null>(null)
  const chatMessagesRef = useRef<Record<string, PrivateMessage[]>>({})

  // 保持 ref 同步
  useEffect(() => {
    activeChatRef.current = activeChat
    chatMessagesRef.current = chatMessages
  }, [activeChat, chatMessages])

  useEffect(() => {
    if (isOpen) {
      loadData()
      loadUnreadCounts()
    }
  }, [isOpen])

  // 监听私聊消息
  useEffect(() => {
    if (!isOpen) return

    const handleNewMessage = (message: PrivateMessage) => {
      const key = message.fromUserId === 'me' ? message.toUserId : message.fromUserId

      // 更新对应聊天的消息
      setChatMessages(prev => {
        const existing = prev[key] || []
        // 避免重复添加
        if (existing.some(m => m.id === message.id)) return prev
        return {
          ...prev,
          [key]: [...existing, message]
        }
      })

      // 如果不是当前打开的聊天，增加未读计数
      if (activeChatRef.current?.friendId !== message.fromUserId) {
        incrementUnreadCount(message.fromUserId)
        setUnreadCounts(prev => ({
          ...prev,
          [message.fromUserId]: (prev[message.fromUserId] || 0) + 1
        }))
      }
    }

    onPrivateMessage(handleNewMessage)
    return () => {
      offPrivateMessage(handleNewMessage)
    }
  }, [isOpen])

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

  const loadUnreadCounts = useCallback(() => {
    const local = getLocalUnreadMessages()
    setUnreadCounts(local)
  }, [])

  // 打开与好友的聊天
  const openChat = async (friend: Friend) => {
    // 加载聊天历史
    const history = await getPrivateChatHistory(friend.id)
    const localHistory = getLocalChatHistory(friend.id)
    const mergedHistory = [...history, ...localHistory].sort((a, b) => a.timestamp - b.timestamp)

    // 合并去重
    const uniqueMessages = mergedHistory.reduce((acc: PrivateMessage[], msg) => {
      if (!acc.some(m => m.id === msg.id)) {
        acc.push(msg)
      }
      return acc
    }, [])

    setChatMessages(prev => ({
      ...prev,
      [friend.id]: uniqueMessages
    }))

    // 标记已读
    markPrivateMessagesRead(friend.id)
    setUnreadCounts(prev => ({ ...prev, [friend.id]: 0 }))

    setActiveChat({
      friendId: friend.id,
      friendUsername: friend.username,
      friendAvatar: friend.avatar,
      messages: uniqueMessages
    })
  }

  // 发送消息
  const handleSendMessage = async (content: string) => {
    const chat = activeChatRef.current
    if (!chat) return

    const result = await sendMsg(chat.friendId, content)

    if (result.success && result.message) {
      setChatMessages(prev => ({
        ...prev,
        [chat.friendId]: [...(prev[chat.friendId] || []), result.message!]
      }))
      // 保存到本地
      const currentMsgs = chatMessagesRef.current[chat.friendId] || []
      saveLocalChatHistory(chat.friendId, [...currentMsgs, result.message!])
    }
  }

  // 关闭聊天
  const closeChat = () => {
    if (activeChat) {
      saveLocalChatHistory(activeChat.friendId, chatMessages[activeChat.friendId] || [])
    }
    setActiveChat(null)
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
      setSearchResults(results.results)
    } catch (error) {
      console.error('搜索失败:', error)
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
      // 刷新请求列表
      const requestsData = await getFriendRequests()
      setReceivedRequests(requestsData.received)
    } else {
      showToast(result.error || '发送失败', 'error')
    }
    setActionLoading(null)
  }

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId)
    const result = await acceptFriendRequest(requestId)
    if (result.success) {
      loadData()
      setActiveTab('list')
    }
    setActionLoading(null)
  }

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId)
    const result = await rejectFriendRequest(requestId)
    if (result.success) {
      loadData()
    }
    setActionLoading(null)
  }

  const handleRemoveFriend = async (friendId: string) => {
    setActionLoading(friendId)
    const result = await removeFriend(friendId)
    if (result.success) {
      loadData()
    }
    setActionLoading(null)
  }

  const tabs: { key: FriendTab; label: string; count?: number }[] = [
    { key: 'list', label: '好友' },
    { key: 'requests', label: '请求', count: receivedRequests.length },
    { key: 'search', label: '添加' }
  ]

  if (!isOpen) return null

  // 聊天视图
  if (activeChat) {
    return (
      <>
        {/* 遮罩层 */}
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={closeChat}
        />
        <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col animate-slide-in">
          <FriendChat
            friendId={activeChat.friendId}
            friendUsername={activeChat.friendUsername}
            friendAvatar={activeChat.friendAvatar}
            messages={chatMessages[activeChat.friendId] || []}
            onSend={handleSendMessage}
            onClose={closeChat}
          />
        </div>
      </>
    )
  }

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col animate-slide-in">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 shrink-0">
          <h2 className="font-semibold text-gray-900">好友</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex gap-1 p-2 border-b border-gray-100 shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
                activeTab === tab.key
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto">
          {/* 好友列表 */}
          {activeTab === 'list' && (
            <div className="p-2 space-y-2">
              {friends.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm mb-2">暂无好友</p>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    添加好友
                  </button>
                </div>
              ) : (
                friends.map(friend => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative">
                        <Avatar src={friend.avatar} username={friend.username} size="sm" />
                        <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${
                          friend.status === 'online' ? 'bg-emerald-500' : 'bg-gray-300'
                        }`} />
                      </div>
                      <span className="text-sm text-gray-700">{friend.username}</span>
                      {unreadCounts[friend.id] > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-red-500 text-white rounded-full">
                          {unreadCounts[friend.id]}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openChat(friend)}
                        className="text-xs text-gray-400 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50"
                        title="聊天"
                      >
                        💬
                      </button>
                      <button
                        onClick={() => setChallengeFriend(friend)}
                        className="text-xs text-gray-400 hover:text-amber-600 px-2 py-1 rounded hover:bg-amber-50"
                        title="挑战"
                      >
                        ⚔️
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        disabled={actionLoading === friend.id}
                        className="text-xs text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 好友请求 */}
          {activeTab === 'requests' && (
            <div className="p-2 space-y-2">
              {receivedRequests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">暂无请求</p>
                </div>
              ) : (
                receivedRequests.map(request => (
                  <div key={request.id} className="p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar src={request.fromUser.avatar} username={request.fromUser.username} size="sm" />
                      <span className="text-sm font-medium text-gray-700">{request.fromUser.username}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(request.id)}
                        disabled={actionLoading === request.id}
                        className="flex-1 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                      >
                        接受
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={actionLoading === request.id}
                        className="flex-1 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                      >
                        拒绝
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 搜索添加 */}
          {activeTab === 'search' && (
            <div className="p-2">
              <input
                type="text"
                value={searchKeyword}
                onChange={e => handleSearch(e.target.value)}
                placeholder="搜索用户名..."
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
              />

              <div className="mt-2 space-y-2">
                {searchLoading ? (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-xs">搜索中...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(result => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar src={result.avatar} username={result.username} size="sm" />
                        <span className="text-sm text-gray-700">{result.username}</span>
                      </div>
                      <div>
                        {result.isFriend ? (
                          <span className="text-xs text-emerald-600 px-2 py-1">已是好友</span>
                        ) : result.hasSentRequest ? (
                          <span className="text-xs text-amber-600 px-2 py-1">已发送</span>
                        ) : result.hasReceivedRequest ? (
                          <span className="text-xs text-blue-600 px-2 py-1">待接受</span>
                        ) : (
                          <button
                            onClick={() => handleSendRequest({
                              id: result.id,
                              username: result.username,
                              avatar: result.avatar
                            })}
                            disabled={actionLoading === result.id}
                            className="px-2 py-1 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                          >
                            添加
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : searchKeyword.trim().length > 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-xs">未找到用户</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-xs">输入用户名搜索</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 挑战邀请弹窗 */}
      {challengeFriend && (
        <ChallengeModal
          friendId={challengeFriend.id}
          friendUsername={challengeFriend.username}
          onClose={() => setChallengeFriend(null)}
          onSent={() => {
            // 可以添加成功提示
          }}
        />
      )}
    </>
  )
}
