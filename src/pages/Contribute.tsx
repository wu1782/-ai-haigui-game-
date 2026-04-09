/**
 * Contribute - 故事投稿页面
 * 包含实时预览、AI润色、Tab切换
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { PageTransition, FadeIn } from '../components/PageTransition'
import { contribute, getMyContributions } from '../services/contributionService'
import type { Contribution, ContributePayload } from '../types/story'
import { DIFFICULTY_CONFIG } from '../constants'
import {
  PenLine,
  Eye,
  Sparkles,
  Send,
  ChevronRight,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react'

// ==================== 类型定义 ====================

interface ContributeFormData {
  title: string
  surface: string
  bottom: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  keywords: string
  tags: string
  hint: string
}

// ==================== 预设标签和关键词 ====================

const PRESET_TAGS = ['悬疑', '恐怖', '反转', '搞笑', '温情', '科幻', '现实', '脑洞']

// ==================== 难度选项 ====================

const DIFFICULTIES = [
  { key: 'easy', label: '入门' },
  { key: 'medium', label: '中等' },
  { key: 'hard', label: '困难' },
  { key: 'extreme', label: '极难' },
] as const

// ==================== AI润色服务（模拟） ====================

async function polishWithAI(surface: string): Promise<string> {
  // 模拟AI润色延迟
  await new Promise(resolve => setTimeout(resolve, 1500))

  // 简单的润色规则（实际应调用后端API）
  let polished = surface

  // 添加悬念描写
  if (!surface.includes('...') && !surface.includes('？') && !surface.includes('?')) {
    polished = polished.trim()
    if (!polished.endsWith('。') && !polished.endsWith('！')) {
      polished += '...'
    }
  }

  // 替换平淡词汇为更有悬念的表达
  const enhancements: [string, string][] = [
    [/很安静/gi, '异常安静'],
    [/出现了/gi, '突然出现了'],
    [/发生了/gi, '诡异的事情发生了'],
    [/有人/gi, '一个神秘的人'],
    [/看到了/gi, '似乎看到了'],
    [/听到了/gi, '隐约听到了'],
  ]

  for (const [pattern, replacement] of enhancements) {
    if (pattern.test(polished)) {
      polished = polished.replace(pattern, replacement)
      break // 只做一处增强，避免过度修改
    }
  }

  return polished
}

// ==================== 子组件：实时预览卡片 ====================

interface PreviewCardProps {
  title: string
  surface: string
  difficulty: string
  tags: string[]
}

function PreviewCard({ title, surface, difficulty, tags }: PreviewCardProps) {
  const diff = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.medium

  return (
    <div className="bg-white/95 dark:bg-dark-800/95 backdrop-blur-xl rounded-2xl border border-gray-200/80 dark:border-dark-700/80 overflow-hidden shadow-xl">
      {/* 顶部难度条 */}
      <div className={`h-1.5 bg-gradient-to-r ${diff.bg} ${diff.text.split(' ')[0].replace('[', '').replace(']', '')}`} />

      {/* 内容 */}
      <div className="p-5">
        {/* 标题 */}
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">
          {title || '给你的故事起个名字'}
        </h3>

        {/* 汤面预览 */}
        <p className={`text-sm mb-4 leading-relaxed ${surface ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 italic'}`}>
          {surface || '输入你的故事背景，让玩家感受谜面的诡异与悬疑...'}
        </p>

        {/* 标签 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tags.slice(0, 4).map((tag, i) => (
              <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-game-100 dark:bg-game-500/20 text-game-600 dark:text-game-400">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 底部信息 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-dark-700/50">
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${diff.bg} ${diff.text} border ${diff.border}`}>
            {diff.label}
          </span>
          <span className="text-xs text-gray-400">预览效果</span>
        </div>
      </div>
    </div>
  )
}

// ==================== 主页面组件 ====================

export default function Contribute() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user, isAuthenticated } = useAuth()

  // Tab状态
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write')

  // AI润色状态
  const [isPolishing, setIsPolishing] = useState(false)
  const [hasPolished, setHasPolished] = useState(false)

  // 投稿记录
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // React Hook Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContributeFormData>({
    defaultValues: {
      title: '',
      surface: '',
      bottom: '',
      difficulty: 'medium',
      keywords: '',
      tags: '',
      hint: '',
    },
  })

  // 监听表单值用于预览
  const watchedValues = watch()
  const selectedTags = watchedValues.tags
    ? watchedValues.tags.split(/[,，、\s]+/).filter(t => t.trim()).slice(0, 5)
    : []

  // 登录检查
  useEffect(() => {
    if (!isAuthenticated) {
      showToast('请先登录后再投稿', 'warning')
      navigate('/auth')
    }
  }, [isAuthenticated, navigate, showToast])

  // 加载投稿记录
  useEffect(() => {
    if (activeTab === 'history' && isAuthenticated) {
      loadContributions()
    }
  }, [activeTab, isAuthenticated])

  const loadContributions = async () => {
    setIsLoadingHistory(true)
    try {
      const result = await getMyContributions({ limit: 10 })
      setContributions(result.contributions)
    } catch (error) {
      console.error('加载投稿失败:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // AI润色汤面
  const handlePolish = async () => {
    const surface = watchedValues.surface
    if (!surface || surface.length < 10) {
      showToast('汤面至少需要10个字符才能润色', 'warning')
      return
    }

    setIsPolishing(true)
    setHasPolished(false)

    try {
      const polished = await polishWithAI(surface)
      setValue('surface', polished)
      setHasPolished(true)
      showToast('AI润色完成！请查看修改结果', 'success')
    } catch (error) {
      showToast('润色失败，请重试', 'error')
    } finally {
      setIsPolishing(false)
    }
  }

  // 提交投稿
  const onSubmit = async (data: ContributeFormData) => {
    try {
      const payload: ContributePayload = {
        title: data.title.trim(),
        surface: data.surface.trim(),
        bottom: data.bottom.trim(),
        difficulty: data.difficulty,
        keywords: data.keywords.split(/[,，、\s]+/).filter(k => k.trim()).slice(0, 10),
        tags: selectedTags,
        hint: data.hint.trim() || undefined,
      }

      await contribute(payload)
      showToast('投稿成功，等待审核', 'success')

      // 重置表单
      reset()
      setHasPolished(false)

      // 切换到记录tab
      setActiveTab('history')
      loadContributions()
    } catch (error) {
      const message = error instanceof Error ? error.message : '投稿失败'
      showToast(message, 'error')
    }
  }

  // 状态徽章
  const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
      case 'pending':
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-lg">
          <Loader2 className="w-3 h-3 animate-spin" /> 待审核
        </span>
      case 'approved':
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg">
          <CheckCircle2 className="w-3 h-3" /> 已通过
        </span>
      case 'rejected':
        return <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg">
          <X className="w-3 h-3" /> 已拒绝
        </span>
      default:
        return null
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-game-500/10 to-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
          {/* 顶部导航 */}
          <FadeIn>
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors group"
              >
                <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
                <span className="text-sm font-medium">返回大厅</span>
              </button>

              {/* Tab切换 */}
              <div className="flex items-center gap-1 p-1.5 bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-dark-700/50 shadow-sm">
                <button
                  onClick={() => setActiveTab('write')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'write'
                      ? 'bg-gradient-to-r from-game-500 to-purple-500 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                >
                  <PenLine className="w-4 h-4" />
                  写故事
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === 'history'
                      ? 'bg-gradient-to-r from-game-500 to-purple-500 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  我的投稿
                </button>
              </div>

              {/* 占位 */}
              <div className="w-24" />
            </div>
          </FadeIn>

          {/* 写故事 Tab */}
          {activeTab === 'write' && (
            <FadeIn>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* 左侧：表单区域 (3/5) */}
                <div className="lg:col-span-3 space-y-6">
                  {/* 表单卡片 */}
                  <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-6 shadow-lg">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                      {/* 标题 */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          标题 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register('title', {
                            required: '请输入标题',
                            maxLength: { value: 100, message: '标题最多100个字符' },
                          })}
                          placeholder="给你的故事起个吸引人的名字"
                          className={`w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                            errors.title
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-gray-200 dark:border-dark-600 focus:border-game-500 focus:ring-game-500/20'
                          }`}
                        />
                        {errors.title && (
                          <p className="flex items-center gap-1 text-red-500 text-xs mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.title.message}
                          </p>
                        )}
                      </div>

                      {/* 难度选择 */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                          难度选择
                        </label>
                        <Controller
                          name="difficulty"
                          control={control}
                          render={({ field }) => (
                            <div className="grid grid-cols-4 gap-2">
                              {DIFFICULTIES.map((d) => {
                                const diff = DIFFICULTY_CONFIG[d.key]
                                return (
                                  <button
                                    key={d.key}
                                    type="button"
                                    onClick={() => field.onChange(d.key)}
                                    className={`py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                                      field.value === d.key
                                        ? `bg-gradient-to-br ${diff.bg} to-white/20 text-white shadow-lg`
                                        : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
                                    }`}
                                  >
                                    {d.label}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        />
                      </div>

                      {/* 汤面 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            汤面 <span className="text-red-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={handlePolish}
                            disabled={isPolishing || !watchedValues.surface}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {isPolishing ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                润色中...
                              </>
                            ) : hasPolished ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5" />
                                重新润色
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                AI优化
                              </>
                            )}
                          </button>
                        </div>
                        <textarea
                          {...register('surface', {
                            required: '请输入汤面',
                            minLength: { value: 10, message: '汤面至少10个字符' },
                            maxLength: { value: 500, message: '汤面最多500个字符' },
                          })}
                          placeholder="输入你的故事背景/谜面...&#10;&#10;技巧：描写一个诡异的场景或事件开头，让玩家产生好奇心"
                          rows={5}
                          className={`w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all resize-none ${
                            errors.surface
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-gray-200 dark:border-dark-600 focus:border-game-500 focus:ring-game-500/20'
                          }`}
                        />
                        <div className="flex justify-between mt-1">
                          {errors.surface && (
                            <p className="flex items-center gap-1 text-red-500 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              {errors.surface.message}
                            </p>
                          )}
                          <p className="text-gray-400 text-xs ml-auto">
                            {watchedValues.surface.length}/500
                          </p>
                        </div>
                        {hasPolished && (
                          <p className="flex items-center gap-1 text-amber-500 text-xs mt-1">
                            <Sparkles className="w-3 h-3" />
                            AI已优化你的汤面，可根据需要手动调整
                          </p>
                        )}
                      </div>

                      {/* 汤底 */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            汤底 <span className="text-red-500">*</span>
                          </label>
                          <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-dark-700/50 text-gray-400">
                            <X className="w-2.5 h-2.5" />
                            仅后台可见
                          </span>
                        </div>
                        <textarea
                          {...register('bottom', {
                            required: '请输入汤底',
                            minLength: { value: 10, message: '汤底至少10个字符' },
                            maxLength: { value: 1000, message: '汤底最多1000个字符' },
                          })}
                          placeholder="输入故事真相/答案...&#10;&#10;这是玩家最终需要猜到的真相"
                          rows={4}
                          className={`w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all resize-none ${
                            errors.bottom
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-gray-200 dark:border-dark-600 focus:border-game-500 focus:ring-game-500/20'
                          }`}
                        />
                        <div className="flex justify-between mt-1">
                          {errors.bottom && (
                            <p className="flex items-center gap-1 text-red-500 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              {errors.bottom.message}
                            </p>
                          )}
                          <p className="text-gray-400 text-xs ml-auto">
                            {watchedValues.bottom.length}/1000
                          </p>
                        </div>
                      </div>

                      {/* 标签选择 */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          标签 <span className="text-gray-400 text-xs font-normal">(点击选择，最多5个)</span>
                        </label>
                        <Controller
                          name="tags"
                          control={control}
                          render={({ field }) => (
                            <div className="flex flex-wrap gap-2">
                              {PRESET_TAGS.map((tag) => {
                                const isSelected = selectedTags.includes(tag)
                                return (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                      const currentTags = field.value
                                        ? field.value.split(/[,，、\s]+/).filter(t => t.trim())
                                        : []
                                      if (isSelected) {
                                        field.onChange(currentTags.filter(t => t !== tag).join(','))
                                      } else if (currentTags.length < 5) {
                                        field.onChange([...currentTags, tag].join(','))
                                      }
                                    }}
                                    className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                                      isSelected
                                        ? 'bg-game-500/20 border-game-500 text-game-600 dark:text-game-400'
                                        : 'bg-gray-50 dark:bg-dark-700 border-gray-200 dark:border-dark-600 text-gray-600 dark:text-gray-400 hover:border-game-500/50'
                                    }`}
                                  >
                                    {tag}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        />
                      </div>

                      {/* 关键词 */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          关键词 <span className="text-gray-400 text-xs font-normal">(选填，逗号分隔)</span>
                        </label>
                        <input
                          type="text"
                          {...register('keywords')}
                          placeholder="例如: 医院, 死亡, 秘密"
                          className="w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20 transition-all"
                        />
                      </div>

                      {/* 提示 */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          提示 <span className="text-gray-400 text-xs font-normal">(选填，最多200字符)</span>
                        </label>
                        <input
                          type="text"
                          {...register('hint')}
                          placeholder="给玩家的一点提示..."
                          maxLength={200}
                          className="w-full px-4 py-3.5 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-game-500 focus:ring-2 focus:ring-game-500/20 transition-all"
                        />
                      </div>

                      {/* 提交按钮 */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-600 hover:to-purple-700
                                 disabled:opacity-50 disabled:cursor-not-allowed
                                 text-white font-bold rounded-xl shadow-lg shadow-game-500/30
                                 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>提交中...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            <span>提交投稿</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>

                  {/* 投稿须知 */}
                  <div className="bg-white/50 dark:bg-dark-800/50 backdrop-blur rounded-xl p-4 border border-gray-200/50 dark:border-dark-700/50">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-game-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">投稿须知</h4>
                        <ul className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <li>• 投稿故事需要审核通过后才能公开显示</li>
                          <li>• 请确保故事内容原创，不得含有违法或不当信息</li>
                          <li>• 审核结果将在1-3个工作日内通知</li>
                          <li>• 汤底仅管理员可见，不会公开</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 右侧：实时预览 (2/5) */}
                <div className="lg:col-span-2">
                  <div className="sticky top-24">
                    <div className="mb-4">
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                        <Eye className="w-4 h-4" />
                        实时预览
                      </h3>
                    </div>
                    <PreviewCard
                      title={watchedValues.title}
                      surface={watchedValues.surface}
                      difficulty={watchedValues.difficulty}
                      tags={selectedTags}
                    />

                    {/* 预览提示 */}
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200/50 dark:border-amber-500/20">
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        <span className="font-semibold">💡 提示：</span>
                        左侧输入时，右侧会实时更新预览效果。好的汤面应该能引发玩家好奇心！
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          )}

          {/* 我的投稿 Tab */}
          {activeTab === 'history' && (
            <FadeIn>
              <div className="max-w-3xl mx-auto">
                <div className="bg-white/80 dark:bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-dark-700/50 p-6 shadow-lg">
                  <h2 className="text-gray-900 dark:text-white font-bold mb-6 flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    我的投稿记录
                  </h2>

                  {isLoadingHistory ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 border-2 border-game-500/30 border-t-game-500 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">加载中...</p>
                    </div>
                  ) : contributions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 dark:bg-dark-700 flex items-center justify-center text-3xl">
                        📭
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 mb-1">暂无投稿记录</p>
                      <p className="text-gray-400 text-sm mb-4">提交你的第一个故事吧！</p>
                      <button
                        onClick={() => setActiveTab('write')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-game-500 to-purple-500 text-white text-sm font-medium rounded-lg shadow-md hover:shadow-lg transition-all"
                      >
                        去投稿
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contributions.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 bg-gray-50 dark:bg-dark-700 rounded-xl border border-gray-200/50 dark:border-dark-600 hover:border-game-500/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <h3 className="text-gray-900 dark:text-white font-medium truncate flex-1">
                              {item.title}
                            </h3>
                            <StatusBadge status={item.status} />
                          </div>

                          <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                            {item.surface}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                item.difficulty === 'easy' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                                item.difficulty === 'medium' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                                item.difficulty === 'hard' ? 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400' :
                                'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400'
                              }`}>
                                {item.difficulty === 'easy' ? '入门' :
                                 item.difficulty === 'medium' ? '中等' :
                                 item.difficulty === 'hard' ? '困难' : '极难'}
                              </span>
                              <span className="text-gray-400 text-xs">
                                {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          </div>

                          {item.status === 'rejected' && item.rejectionReason && (
                            <div className="mt-3 p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200/50 dark:border-red-500/20">
                              <p className="text-red-600 dark:text-red-400 text-xs">
                                <span className="font-semibold">拒绝原因：</span>
                                {item.rejectionReason}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </FadeIn>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
