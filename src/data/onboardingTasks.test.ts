import { describe, it, expect, beforeEach } from 'vitest'
import {
  getOnboardingTaskState,
  markFirstGameStarted,
  markFirstQuestionAsked,
  markGameFinished,
  canClaimOnboardingReward,
  claimOnboardingReward
} from './onboardingTasks'

const STORAGE_KEY = 'turtle-soup-onboarding-tasks'

describe('onboardingTasks', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should initialize with default state', () => {
    const state = getOnboardingTaskState()
    expect(state.firstGameStarted).toBe(false)
    expect(state.firstQuestionAsked).toBe(false)
    expect(state.firstGameWon).toBe(false)
    expect(state.rewardClaimed).toBe(false)
    expect(state.rewardPoints).toBe(50)
  })

  it('should complete onboarding tasks flow and claim reward once', () => {
    markFirstGameStarted()
    markFirstQuestionAsked()
    markGameFinished(true)

    const state = getOnboardingTaskState()
    expect(state.firstGameStarted).toBe(true)
    expect(state.firstQuestionAsked).toBe(true)
    expect(state.firstGameWon).toBe(true)

    expect(canClaimOnboardingReward()).toBe(true)

    const firstClaim = claimOnboardingReward()
    expect(firstClaim.success).toBe(true)
    expect(firstClaim.points).toBe(50)

    const secondClaim = claimOnboardingReward()
    expect(secondClaim.success).toBe(false)
    expect(secondClaim.message).toContain('已领取')

    const persisted = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    expect(persisted.rewardClaimed).toBe(true)
  })

  it('should not mark win when game is lost', () => {
    markFirstGameStarted()
    markFirstQuestionAsked()
    markGameFinished(false)

    const state = getOnboardingTaskState()
    expect(state.firstGameWon).toBe(false)
    expect(canClaimOnboardingReward()).toBe(false)
  })
})
