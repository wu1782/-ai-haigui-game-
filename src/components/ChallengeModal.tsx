import { useState } from 'react'
import { socketService } from '../services/socketService'
import { stories } from '../data/stories'

interface ChallengeModalProps {
  friendId: string
  friendUsername: string
  onClose: () => void
  onSent: () => void
}

/**
 * 好友对战邀请弹窗
 */
export default function ChallengeModal({ friendId, friendUsername, onClose, onSent }: ChallengeModalProps) {
  const [selectedStory, setSelectedStory] = useState(stories[Math.floor(Math.random() * stories.length)].id)
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    setSending(true)
    try {
      await socketService.sendChallengeInvite(friendId, selectedStory)
      onSent()
      onClose()
    } catch (error) {
      console.error('发送挑战失败:', error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-dark-800 rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          发起挑战
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          向 <span className="font-medium text-gray-900 dark:text-white">{friendUsername}</span> 发起对战
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            选择故事
          </label>
          <select
            value={selectedStory}
            onChange={e => setSelectedStory(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white text-sm"
          >
            {stories.slice(0, 10).map(story => (
              <option key={story.id} value={story.id}>
                {story.title} ({story.starLevel}星)
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            {sending ? '发送中...' : '发送挑战'}
          </button>
        </div>
      </div>
    </div>
  )
}
