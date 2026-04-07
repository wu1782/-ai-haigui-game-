import { useState, useEffect } from 'react'
import { getComments, addComment, likeComment, type StoryComment } from '../data/storyComments'
import { useAuth } from '../hooks/useAuth'

interface CommentListProps {
  storyId: string
}

/**
 * 故事评论列表组件
 */
export default function CommentList({ storyId }: CommentListProps) {
  const [comments, setComments] = useState<StoryComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    setComments(getComments(storyId))
  }, [storyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setLoading(true)
    try {
      const comment = addComment(storyId, newComment.trim(), user?.username || '匿名用户')
      setComments(prev => [comment, ...prev])
      setNewComment('')
    } finally {
      setLoading(false)
    }
  }

  const handleLike = (commentId: string) => {
    likeComment(storyId, commentId)
    setComments(getComments(storyId))
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-4">
      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="写下你的评论..."
          maxLength={200}
          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={!newComment.trim() || loading}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          发送
        </button>
      </form>

      {/* 评论列表 */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          暂无评论，来发表第一个评论吧
        </div>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.map(comment => (
            <div key={comment.id} className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {comment.author}
                </span>
                <span className="text-xs text-gray-400">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                {comment.content}
              </p>
              <button
                onClick={() => handleLike(comment.id)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-500 transition-colors"
              >
                <span>👍</span>
                <span>{comment.likes}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
