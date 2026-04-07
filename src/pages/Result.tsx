import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { TStory, TMessage } from '../types'
import { updateStatsAfterGame, getUserStats, getCurrentRank } from '../data/userData'
import { AchievementGrid } from '../components/AchievementBadge'
import RatingStars from '../components/RatingStars'
import ShareCard from '../components/ShareCard'
import CommentList from '../components/CommentList'
import { rateStory, getStoryRating } from '../data/storyRatings'
import { shareToWeibo, shareToClipboard } from '../utils/shareUtils'
import { getStreakBonusText } from '../data/userData'
import { claimDailyReward, canClaimDailyReward, getDailyChallenge } from '../data/dailyChallenge'
import { useToast } from '../context/ToastContext'

interface ResultState {
  story: TStory
  questionCount: number
  messages: TMessage[]
  isWin?: boolean
  endType?: 'guess' | 'giveup' | 'timeout'
  elapsedTime?: number
}

// 格式化时间
const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function Result() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as ResultState | null
  const [showBottom, setShowBottom] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [copied, setCopied] = useState(false)
  const [newAchievements, setNewAchievements] = useState<string[]>([])
  const [userStats, setUserStats] = useState(getUserStats())
  const [difficultyRating, setDifficultyRating] = useState(0)
  const [enjoyRating, setEnjoyRating] = useState(0)
  const [hasRatedStory, setHasRatedStory] = useState(false)
  const [showShareCard, setShowShareCard] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showRewardClaimed, setShowRewardClaimed] = useState(false)

  if (!state) {
    navigate('/')
    return null
  }

  const { story, questionCount, messages, isWin, endType, elapsedTime } = state

  // 检查是否已评分
  useEffect(() => {
    const existing = getStoryRating(story.id)
    if (existing) {
      setDifficultyRating(existing.difficulty)
      setEnjoyRating(existing.enjoyability)
      setHasRatedStory(true)
    }
  }, [story.id])

  // 游戏结束时更新统计
  useEffect(() => {
    if (state) {
      const { stats, newAchievements: newAch } = updateStatsAfterGame(isWin || false, questionCount)
      setUserStats(stats)
      setNewAchievements(newAch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentRank = getCurrentRank(userStats)
  const { showToast } = useToast()

  // 结束方式描述
  const getEndTypeText = () => {
    switch (endType) {
      case 'guess': return '推理成功'
      case 'giveup': return '中途放弃'
      case 'timeout': return '次数用尽'
      default: return isWin ? '推理成功' : '游戏结束'
    }
  }

  // 打字机效果
  useEffect(() => {
    const timer = setTimeout(() => setShowBottom(true), 300)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!showBottom) return

    const text = story.bottom
    let index = 0
    const interval = setInterval(() => {
      if (index < text.length) {
        index++
        setDisplayedText(text.slice(0, index))
      } else {
        setDisplayedText(text)
        clearInterval(interval)
      }
    }, 25)

    return () => clearInterval(interval)
  }, [showBottom, story.bottom])

  // 关键提问
  const valuableQuestions = messages
    .filter(msg => msg.type === 'is')
    .slice(-3)

  // 玩家消息
  const playerMessages = messages.filter(msg => msg.role === 'user')

  // 分享处理
  const handleShare = async () => {
    const success = await shareToClipboard({
      story,
      questionCount,
      isWin: isWin || false,
      elapsedTime,
      elapsedTimeFormatted: elapsedTime ? formatTime(elapsedTime) : undefined
    })
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareWeibo = () => {
    shareToWeibo({
      story,
      questionCount,
      isWin: isWin || false,
      elapsedTime,
      elapsedTimeFormatted: elapsedTime ? formatTime(elapsedTime) : undefined
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-game-900/30 to-dark-900 relative overflow-hidden">
      {/* 背景光晕 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-game-500/10 to-purple-500/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4 py-8">
        {/* 结果标题 */}
        <div className="text-center mb-8 animate-fade-up">
          {/* 状态指示器 */}
          <div className={`relative inline-flex items-center justify-center w-24 h-24 rounded-full mb-6 ${
            isWin
              ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/50'
              : 'bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/50'
          }`}>
            <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse" />
            <span className={`text-4xl font-bold text-white`}>
              {isWin ? '🎉' : endType === 'giveup' ? '🤔' : '😢'}
            </span>
          </div>

          <h1 className={`text-3xl font-bold mb-2 ${
            isWin ? 'text-gradient' : 'text-white'
          }`}>
            {isWin ? '恭喜破案！' : '游戏结束'}
          </h1>

          <p className="text-gray-400">
            {isWin
              ? `你用 ${questionCount} 次提问成功还原了真相`
              : endType === 'giveup'
              ? `你在第 ${questionCount} 次提问时选择了放弃`
              : '很遗憾你没有解开这个谜题'}
          </p>

          {/* 状态标签 */}
          <div className="mt-4 inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-game-500/30 backdrop-blur-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${
              isWin ? 'bg-emerald-400 animate-pulse' : endType === 'giveup' ? 'bg-amber-400' : 'bg-red-400'
            }`} />
            <span className="text-gray-300 text-sm font-medium">{getEndTypeText()}</span>
            <span className="text-gray-500">·</span>
            <span className="text-game-400 text-sm font-bold">{currentRank.icon} {currentRank.title}</span>
          </div>

          {/* 新成就解锁提示 */}
          {newAchievements.length > 0 && (
            <div className="mt-4 animate-fade-up">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                <span className="text-amber-400 text-sm font-bold">🎉 解锁新成就!</span>
              </div>
            </div>
          )}
        </div>

        {/* 汤底揭示 */}
        <div className={`bg-white/5 backdrop-blur-xl rounded-3xl border border-game-500/20 p-6 mb-5 transition-all duration-700 animate-fade-up ${
          showBottom ? 'border-game-500/40' : 'border-game-500/10'
        }`} style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-game-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-sm font-bold">汤</span>
            </div>
            <div>
              <h2 className="text-white font-bold">汤底揭晓</h2>
              <p className="text-gray-500 text-xs">Story Revealed</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-sm w-12">故事</span>
              <span className="text-white font-medium">{story.title}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-sm w-12">难度</span>
              <span className={`font-medium ${
                story.difficulty === 'easy' ? 'text-emerald-400' :
                story.difficulty === 'medium' ? 'text-amber-400' :
                story.difficulty === 'hard' ? 'text-red-400' : 'text-purple-400'
              }`}>
                {story.difficulty === 'easy' ? '入门' :
                 story.difficulty === 'medium' ? '中等' :
                 story.difficulty === 'hard' ? '困难' : '极难'}（{story.starLevel}星）
              </span>
            </div>

            {/* 汤底文字 */}
            <div className="pt-4 border-t border-white/10">
              <div className={`bg-dark-900/80 rounded-2xl p-4 border border-game-500/10 transition-all duration-700 ${
                showBottom ? 'opacity-100' : 'opacity-0'
              }`}>
                <p className="text-gray-200 leading-relaxed font-mono">
                  {displayedText}
                  {showBottom && displayedText.length < story.bottom.length && (
                    <span className="inline-block w-0.5 h-4 bg-game-400 ml-0.5 animate-pulse" />
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 对话历史 */}
        {playerMessages.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-game-500/20 p-5 mb-5 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between text-white font-bold mb-4 hover:text-game-400 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <span>对话历史</span>
                <span className="text-sm font-normal text-gray-500">({playerMessages.length})</span>
              </span>
              <span className={`text-sm text-game-400 transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* 关键突破 */}
            {valuableQuestions.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-game-400 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  关键突破
                </h3>
                <div className="space-y-2">
                  {valuableQuestions.map((q) => {
                    const msgIndex = messages.findIndex(m => m.id === q.id)
                    const qNumber = messages.slice(0, msgIndex + 1).filter(m => m.role === 'user').length
                    return (
                      <div key={q.id} className="flex items-center gap-3 bg-dark-900/50 rounded-xl px-4 py-3 border border-emerald-500/20">
                        <span className="text-game-400 font-bold text-sm font-mono">
                          Q{qNumber}
                        </span>
                        <span className="text-gray-200 text-sm flex-1">{q.content}</span>
                        <span className="text-emerald-400 text-sm font-bold">是 ✓</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 完整历史 */}
            <div className={`overflow-hidden transition-all duration-500 ${showHistory ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="border-t border-white/10 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">全部提问</h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {messages.map((msg, index) => {
                    if (msg.role === 'user') {
                      const answerMsg = messages[index + 1]
                      const answerType = answerMsg?.type
                      const isYes = answerType === 'is'
                      const isNo = answerType === 'no'
                      const isIrrelevant = answerType === 'irrelevant' || answerType === 'victory'
                      return (
                        <div key={msg.id} className="flex items-start gap-3 text-sm font-mono">
                          <span className="text-gray-600 shrink-0">Q{Math.floor(index / 2) + 1}</span>
                          <span className="text-gray-300 flex-1">{msg.content}</span>
                          <span className={`shrink-0 font-bold ${
                            isYes ? 'text-emerald-400' :
                            isNo ? 'text-red-400' :
                            'text-gray-500'
                          }`}>
                            {isYes ? '是' : isNo ? '否' : isIrrelevant ? '无关' : '?'}
                          </span>
                        </div>
                      )
                    }
                    return null
                  }).filter(Boolean)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 统计信息 */}
        <div className="grid grid-cols-4 gap-3 mb-5 animate-fade-up" style={{ animationDelay: '300ms' }}>
          {[
            { label: '提问次数', value: questionCount, icon: '❓' },
            { label: '用时', value: elapsedTime ? formatTime(elapsedTime) : '--', icon: '⏱️' },
            { label: '胜率', value: `${userStats.winRate}%`, icon: '📊' },
            { label: '最高连胜', value: userStats.bestStreak, icon: '🔥', extra: userStats.currentStreak > 1 ? getStreakBonusText(userStats.currentStreak) : null },
          ].map(({ label, value, icon, extra }) => (
            <div key={label} className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-game-500/20 text-center">
              <div className="text-lg mb-1">{icon}</div>
              <div className="text-xl font-bold text-white">{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
              {extra && <div className="text-xs text-amber-400 mt-1">{extra}</div>}
            </div>
          ))}
        </div>

        {/* 每日挑战奖励领取 */}
        {(() => {
          const daily = getDailyChallenge()
          const canClaim = canClaimDailyReward()
          if (!daily || !daily.completed || !isWin) return null
          return (
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-xl rounded-2xl p-4 mb-5 border border-amber-500/30 animate-fade-up" style={{ animationDelay: '320ms' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl shadow-lg">
                    📅
                  </div>
                  <div>
                    <div className="text-white font-bold">每日挑战</div>
                    <div className="text-gray-400 text-xs">
                      挑战完成 · 奖励 x{daily.bonusMultiplier}
                    </div>
                  </div>
                </div>
                {canClaim ? (
                  <button
                    onClick={() => {
                      claimDailyReward()
                      setShowRewardClaimed(true)
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all shadow-lg text-sm"
                  >
                    领取奖励
                  </button>
                ) : showRewardClaimed ? (
                  <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 font-bold rounded-xl text-sm border border-emerald-500/30">
                    ✓ 已领取
                  </span>
                ) : (
                  <span className="px-4 py-2 bg-amber-500/20 text-amber-400 font-bold rounded-xl text-sm border border-amber-500/30">
                    已领取
                  </span>
                )}
              </div>
            </div>
          )
        })()}

        {/* 评分区域 */}
        {isWin && !hasRatedStory && (
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-game-500/20 p-5 mb-5 animate-fade-up" style={{ animationDelay: '320ms' }}>
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <span className="text-xl">⭐</span>
              为故事打分
            </h3>
            <div className="flex gap-8">
              <RatingStars
                value={difficultyRating}
                onChange={setDifficultyRating}
                label="难度"
              />
              <RatingStars
                value={enjoyRating}
                onChange={setEnjoyRating}
                label="有趣度"
              />
            </div>
            {(difficultyRating > 0 || enjoyRating > 0) && !hasRatedStory && (
              <button
                onClick={() => {
                  if (difficultyRating > 0 || enjoyRating > 0) {
                    rateStory(story.id, difficultyRating || 3, enjoyRating || 3)
                    setHasRatedStory(true)
                    showToast('评分提交成功，感谢您的反馈！', 'success')
                  }
                }}
                className="mt-4 px-5 py-2.5 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-400 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg text-sm"
              >
                提交评分
              </button>
            )}
          </div>
        )}

        {/* 评论区域 */}
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-game-500/20 p-5 mb-5 animate-fade-up" style={{ animationDelay: '340ms' }}>
          <button
            onClick={() => setShowComments(!showComments)}
            className="w-full flex items-center justify-between text-white font-bold mb-3 hover:text-game-400 transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="text-xl">💭</span>
              <span>评论</span>
            </span>
            <span className="text-game-400">{showComments ? '▲' : '▼'}</span>
          </button>
          {showComments && <CommentList storyId={story.id} />}
        </div>

        {/* 新成就展示 */}
        {newAchievements.length > 0 && (
          <div className="mb-5 animate-fade-up" style={{ animationDelay: '350ms' }}>
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-game-500/20 p-5">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <span className="text-xl">🏆</span>
                新解锁的成就
              </h3>
              <AchievementGrid newAchievements={newAchievements} />
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-3 animate-fade-up" style={{ animationDelay: '400ms' }}>
          <button
            onClick={() => navigate('/')}
            className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-game-500/30 text-white font-medium rounded-2xl transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
          >
            <span>🏠</span>
            <span>返回首页</span>
          </button>
          <button
            onClick={() => setShowShareCard(true)}
            className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-game-500/30 text-white font-medium rounded-2xl transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
          >
            <span>📤</span>
            <span>分享</span>
          </button>
          <button
            onClick={() => navigate(`/game/${story.id}`)}
            className="flex-1 py-3.5 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-400 hover:to-purple-500 text-white font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <span>🔄</span>
            <span>再来一局</span>
          </button>
        </div>

        {/* 分享卡片弹窗 */}
        {showShareCard && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowShareCard(false)}>
            <div className="bg-gradient-to-br from-dark-800 to-dark-900 rounded-3xl p-6 max-w-sm w-full border border-game-500/30 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-4 text-center flex items-center justify-center gap-2">
                <span>🎴</span>
                <span>分享战绩</span>
              </h3>
              <div className="flex justify-center mb-6">
                <ShareCard
                  story={story}
                  questionCount={questionCount}
                  isWin={isWin || false}
                  elapsedTimeFormatted={elapsedTime ? formatTime(elapsedTime) : undefined}
                  difficulty={story.difficulty}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 py-3 bg-gradient-to-r from-game-500 to-purple-600 hover:from-game-400 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <span>{copied ? '✓ 已复制!' : '📋 复制'}</span>
                </button>
                <button
                  onClick={handleShareWeibo}
                  className="px-5 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all shadow-lg"
                  title="分享到微博"
                >
                  微博
                </button>
              </div>
              <button
                onClick={() => setShowShareCard(false)}
                className="w-full mt-4 py-2 text-gray-500 hover:text-white transition-colors text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Result
