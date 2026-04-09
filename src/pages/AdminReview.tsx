/**
 * AdminReview - 审核管理页面 - 游戏化风格
 * 管理员审核用户投稿的故事
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { PageTransition, FadeIn } from '../components/PageTransition'
import {
  getReviewStories,
  getStoryDetailForReview,
  reviewStory,
  getReviewStats
} from '../services/contributionService'
import type { ContributionStory, StoryStatus } from '../types/story'

type FilterTab = 'pending' | 'approved' | 'rejected'

function AdminReview() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user, isAuthenticated } = useAuth()

  // 状态
  const [filter, setFilter] = useState<FilterTab>('pending')
  const [stories, setStories] = useState<ContributionStory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStory, setSelectedStory] = useState<ContributionStory | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [isReviewing, setIsReviewing] = useState(false)
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 })
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })

  // 权限检查
  useEffect(() => {
    if (!isAuthenticated) {
      showToast('请先登录', 'warning')
      navigate('/auth')
      return
    }
    if (user?.role !== 'admin') {
      showToast('需要管理员权限', 'error')
      navigate('/')
    }
  }, [isAuthenticated, user, navigate, showToast])

  // 加载统计数据
  const loadStats = async () => {
    try {
      const data = await getReviewStats()
      setStats(data)
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  // 加载故事列表
  const loadStories = async (page = 1) => {
    setIsLoading(true)
    try {
      const result = await getReviewStories(filter, { page, limit: 20 })
      setStories(result.stories)
      setPagination({
        page: result.pagination.page,
        pages: result.pagination.pages,
        total: result.pagination.total
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载失败'
      showToast(message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      loadStats()
      loadStories(1)
    }
  }, [filter, user])

  // 查看详情
  const handleViewDetail = async (storyId: string) => {
    try {
      const detail = await getStoryDetailForReview(storyId)
      setSelectedStory(detail as ContributionStory)
      setShowDetail(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : '加载详情失败'
      showToast(message, 'error')
    }
  }

  // 执行审核
  const handleReview = async () => {
    if (!selectedStory) return

    if (reviewAction === 'rejected' && !rejectionReason.trim()) {
      showToast('请填写拒绝原因', 'error')
      return
    }

    setIsReviewing(true)
    try {
      await reviewStory(selectedStory.id, reviewAction!, rejectionReason.trim() || undefined)
      showToast(
        reviewAction === 'approved' ? '已批准上架' : '已拒绝',
        'success'
      )
      setShowDetail(false)
      setSelectedStory(null)
      setReviewAction(null)
      setRejectionReason('')
      loadStats()
      loadStories(pagination.page)
    } catch (error) {
      const message = error instanceof Error ? error.message : '审核失败'
      showToast(message, 'error')
    } finally {
      setIsReviewing(false)
    }
  }

  // 关闭详情
  const handleCloseDetail = () => {
    setShowDetail(false)
    setSelectedStory(null)
    setReviewAction(null)
    setRejectionReason('')
  }

  const getDifficultyBadge = (difficulty: string) => {
    const colors = {
      easy: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      medium: 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400',
      hard: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
      extreme: 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
    }
    const labels = { easy: '入门', medium: '中等', hard: '困难', extreme: '极难' }
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[difficulty as keyof typeof colors]}`}>
        {labels[difficulty as keyof typeof labels]}
      </span>
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

        {/* 主内容 */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
          {/* 返回按钮 */}
          <FadeIn>
            <button
              onClick={() => navigate('/')}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors mb-6"
            >
              <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
              <span className="text-sm font-medium">返回大厅</span>
            </button>
          </FadeIn>

          {/* 页面标题 */}
          <FadeIn delay={50}>
            <header className="text-center mb-8">
              <div className="relative inline-flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center text-3xl shadow-lg shadow-game-500/30">
                  🔍
                </div>
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-game-400 to-purple-400 opacity-30 blur-xl -z-10" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                故事审核
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                管理用户提交的故事投稿
              </p>
            </header>
          </FadeIn>

          {/* 统计卡片 */}
          <FadeIn delay={100}>
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-4 text-center">
                <div className="text-2xl font-bold text-amber-500">{stats.pending}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">待审核</div>
              </div>
              <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-4 text-center">
                <div className="text-2xl font-bold text-emerald-500">{stats.approved}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">已通过</div>
              </div>
              <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-4 text-center">
                <div className="text-2xl font-bold text-red-500">{stats.rejected}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">已拒绝</div>
              </div>
              <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-4 text-center">
                <div className="text-2xl font-bold text-game-500">{stats.total}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">总计</div>
              </div>
            </div>
          </FadeIn>

          {/* 筛选标签 */}
          <FadeIn delay={150}>
            <div className="flex gap-2 mb-6">
              {(['pending', 'approved', 'rejected'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filter === tab
                      ? 'bg-gradient-to-r from-game-500 to-purple-600 text-white shadow-lg'
                      : 'bg-white/80 dark:bg-dark-800/80 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                >
                  {tab === 'pending' ? '待审核' : tab === 'approved' ? '已通过' : '已拒绝'}
                  {tab === 'pending' && stats.pending > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                      {stats.pending}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </FadeIn>

          {/* 故事列表 */}
          <FadeIn delay={200}>
            <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-dark-700/50 p-6 shadow-lg">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-game-500/30 border-t-game-500 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">加载中...</p>
                </div>
              ) : stories.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center text-3xl">
                    📭
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    {filter === 'pending' ? '暂无待审核故事' : filter === 'approved' ? '暂无已通过故事' : '暂无已拒绝故事'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stories.map((story) => (
                    <div
                      key={story.id}
                      className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200/50 dark:border-dark-600 hover:border-game-500/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-gray-900 dark:text-white font-medium truncate">
                              {story.title}
                            </h3>
                            {getDifficultyBadge(story.difficulty)}
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-2">
                            {story.surface}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            {story.contributor && (
                              <span>投稿人：{story.contributor.username}</span>
                            )}
                            <span>{new Date(story.createdAt).toLocaleDateString('zh-CN')}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleViewDetail(story.id)}
                            className="px-3 py-1.5 bg-game-500/10 text-game-500 hover:bg-game-500/20 rounded-lg text-sm font-medium transition-colors"
                          >
                            查看
                          </button>
                          {filter === 'pending' && (
                            <button
                              onClick={async () => {
                                setSelectedStory(story)
                                setReviewAction('approved')
                                setShowDetail(true)
                              }}
                              className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-lg text-sm font-medium transition-colors"
                            >
                              通过
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 分页 */}
              {pagination.pages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <button
                    onClick={() => loadStories(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1.5 text-gray-500 text-sm">
                    {pagination.page} / {pagination.pages}
                  </span>
                  <button
                    onClick={() => loadStories(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          </FadeIn>
        </div>

        {/* 详情弹窗 */}
        {showDetail && selectedStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleCloseDetail}
            />
            <div className="relative bg-white dark:bg-dark-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
              {/* 头部 */}
              <div className="bg-gradient-to-r from-game-500 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">故事详情</h2>
                  <button
                    onClick={handleCloseDetail}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* 内容 */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-4">
                  {/* 基本信息 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedStory.title}</h3>
                      {getDifficultyBadge(selectedStory.difficulty)}
                    </div>
                    {selectedStory.contributor && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        投稿人：{selectedStory.contributor.username}
                      </p>
                    )}
                  </div>

                  {/* 汤面 */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                      汤面
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-dark-700 rounded-xl text-gray-700 dark:text-gray-200 text-sm">
                      {selectedStory.surface}
                    </div>
                  </div>

                  {/* 汤底 */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                      汤底
                    </label>
                    <div className="p-3 bg-game-500/10 rounded-xl text-gray-700 dark:text-gray-200 text-sm">
                      {selectedStory.bottom || '（管理员可见）'}
                    </div>
                  </div>

                  {/* 关键词和标签 */}
                  {((selectedStory.keywords?.length ?? 0) > 0 || (selectedStory.tags?.length ?? 0) > 0) && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                        关键词 / 标签
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedStory.keywords?.map((k, i) => (
                          <span key={i} className="px-2 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs rounded-lg">
                            {k}
                          </span>
                        ))}
                        {selectedStory.tags?.map((t, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-lg">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 提示 */}
                  {selectedStory.hint && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                        提示
                      </label>
                      <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-gray-700 dark:text-gray-200 text-sm">
                        {selectedStory.hint}
                      </div>
                    </div>
                  )}

                  {/* 审核操作 */}
                  {filter === 'pending' && (
                    <div className="pt-4 border-t border-gray-200 dark:border-dark-600">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                        审核操作
                      </label>
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => setReviewAction('approved')}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            reviewAction === 'approved'
                              ? 'bg-emerald-500 text-white shadow-lg'
                              : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                          }`}
                        >
                          ✓ 批准通过
                        </button>
                        <button
                          onClick={() => setReviewAction('rejected')}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            reviewAction === 'rejected'
                              ? 'bg-red-500 text-white shadow-lg'
                              : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                          }`}
                        >
                          ✕ 拒绝
                        </button>
                      </div>

                      {reviewAction === 'rejected' && (
                        <div className="mb-3">
                          <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="请填写拒绝原因..."
                            rows={2}
                            maxLength={200}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none text-sm"
                          />
                          <p className="text-gray-400 text-xs mt-1 text-right">{rejectionReason.length}/200</p>
                        </div>
                      )}

                      <button
                        onClick={handleReview}
                        disabled={!reviewAction || isReviewing}
                        className="w-full py-3 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 text-white font-bold rounded-xl shadow-lg shadow-game-500/30 transition-all flex items-center justify-center gap-2"
                      >
                        {isReviewing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>处理中...</span>
                          </>
                        ) : (
                          <span>确认{reviewAction === 'approved' ? '通过' : '拒绝'}</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}

export default AdminReview
