/**
 * 新手引导 Hook
 * 管理引导状态，显示给新用户
 */
import { useState, useCallback, useEffect } from 'react'

export interface OnboardingStep {
  id: string
  title: string
  content: string
  target?: string  // CSS selector for target element
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '欢迎来到海龟汤',
    content: '一款 AI 驱动的沉浸式推理游戏。通过提问还原故事真相，找出汤底！',
    position: 'center'
  },
  {
    id: 'how-to-play',
    title: '游戏规则',
    content: '输入只能用「是」「否」或「与此无关」回答的问题，逐步推理出故事真相！',
    position: 'bottom'
  },
  {
    id: 'ask-questions',
    title: '开始推理',
    content: '在输入框中输入你的问题，每题有时间限制哦！使用提示可以获得帮助。',
    position: 'top'
  },
  {
    id: 'guess-answer',
    title: '猜出真相',
    content: '当你确定答案时，点击「猜答案」提交你的推理。也可以随时放弃查看汤底。',
    position: 'top'
  }
]

const STORAGE_KEY = 'turtle-soup-onboarding-completed'
const ONBOARDING_VERSION = 'v1'

/**
 * 获取 localStorage 中已完成引导的版本列表
 */
function getCompletedVersions(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * 标记引导已完成
 */
function markOnboardingCompleted(): void {
  try {
    const completed = getCompletedVersions()
    if (!completed.includes(ONBOARDING_VERSION)) {
      completed.push(ONBOARDING_VERSION)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(completed))
    }
  } catch {
    // localStorage 不可用时静默失败
  }
}

interface UseOnboardingReturn {
  steps: OnboardingStep[]
  currentStep: OnboardingStep
  currentStepIndex: number
  isFirstTime: boolean
  isVisible: boolean
  totalSteps: number
  startOnboarding: () => void
  nextStep: () => void
  prevStep: () => void
  completeOnboarding: () => void
  skipOnboarding: () => void
}

export function useOnboarding(): UseOnboardingReturn {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  // 检查是否是第一次使用
  const completedVersions = getCompletedVersions()
  const isFirstTime = !completedVersions.includes(ONBOARDING_VERSION)

  const totalSteps = ONBOARDING_STEPS.length
  const currentStep = ONBOARDING_STEPS[currentStepIndex]

  // 组件挂载时，如果从未完成过引导，自动显示
  useEffect(() => {
    if (isFirstTime) {
      // 延迟显示，让页面先渲染
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [isFirstTime])

  const startOnboarding = useCallback(() => {
    setCurrentStepIndex(0)
    setIsVisible(true)
  }, [])

  const nextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1)
    } else {
      completeOnboarding()
    }
  }, [currentStepIndex, totalSteps])

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
    }
  }, [currentStepIndex])

  const completeOnboarding = useCallback(() => {
    markOnboardingCompleted()
    setIsVisible(false)
  }, [])

  const skipOnboarding = useCallback(() => {
    markOnboardingCompleted()
    setIsVisible(false)
  }, [])

  return {
    steps: ONBOARDING_STEPS,
    currentStep,
    currentStepIndex,
    isFirstTime,
    isVisible,
    totalSteps,
    startOnboarding,
    nextStep,
    prevStep,
    completeOnboarding,
    skipOnboarding
  }
}

export default useOnboarding
