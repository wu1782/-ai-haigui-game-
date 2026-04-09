import { STORAGE_KEYS } from '../constants'

export interface OnboardingTaskState {
  firstGameStarted: boolean
  firstQuestionAsked: boolean
  firstGameWon: boolean
  rewardClaimed: boolean
  rewardPoints: number
  updatedAt: number
}

const DEFAULT_STATE: OnboardingTaskState = {
  firstGameStarted: false,
  firstQuestionAsked: false,
  firstGameWon: false,
  rewardClaimed: false,
  rewardPoints: 50,
  updatedAt: Date.now()
}

function readState(): OnboardingTaskState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ONBOARDING_TASKS)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_STATE,
      ...parsed,
      updatedAt: Date.now()
    }
  } catch {
    return DEFAULT_STATE
  }
}

function saveState(state: OnboardingTaskState): OnboardingTaskState {
  const next = { ...state, updatedAt: Date.now() }
  localStorage.setItem(STORAGE_KEYS.ONBOARDING_TASKS, JSON.stringify(next))
  return next
}

export function getOnboardingTaskState(): OnboardingTaskState {
  return readState()
}

export function markFirstGameStarted(): OnboardingTaskState {
  const state = readState()
  if (state.firstGameStarted) return state
  return saveState({ ...state, firstGameStarted: true })
}

export function markFirstQuestionAsked(): OnboardingTaskState {
  const state = readState()
  if (state.firstQuestionAsked) return state
  return saveState({ ...state, firstQuestionAsked: true })
}

export function markGameFinished(isWin: boolean): OnboardingTaskState {
  const state = readState()
  return saveState({
    ...state,
    firstGameStarted: true,
    firstGameWon: state.firstGameWon || isWin
  })
}

export function isOnboardingTasksCompleted(state = readState()): boolean {
  return state.firstGameStarted && state.firstQuestionAsked && state.firstGameWon
}

export function canClaimOnboardingReward(state = readState()): boolean {
  return isOnboardingTasksCompleted(state) && !state.rewardClaimed
}

export function claimOnboardingReward(): { success: boolean; message: string; points: number; state: OnboardingTaskState } {
  const state = readState()
  if (!isOnboardingTasksCompleted(state)) {
    return { success: false, message: '请先完成新手任务', points: 0, state }
  }
  if (state.rewardClaimed) {
    return { success: false, message: '奖励已领取', points: 0, state }
  }

  const next = saveState({ ...state, rewardClaimed: true })
  return {
    success: true,
    message: `已领取新手奖励 +${next.rewardPoints}`,
    points: next.rewardPoints,
    state: next
  }
}
