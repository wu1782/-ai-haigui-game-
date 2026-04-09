import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Contribute from './Contribute'

const mockGetMyContributions = vi.fn()

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'u1', username: 'tester' }
  })
}))

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn()
  })
}))

vi.mock('../services/contributionService', () => ({
  contribute: vi.fn(),
  getMyContributions: (...args: unknown[]) => mockGetMyContributions(...args)
}))

describe('Contribute creator incentive panel', () => {
  beforeEach(() => {
    mockGetMyContributions.mockReset()
  })

  it('shows creator level and approved count in history tab', async () => {
    mockGetMyContributions.mockResolvedValue({
      contributions: [
        { id: '1', title: 'a', surface: 's', difficulty: 'easy', starLevel: 1, status: 'approved', createdAt: '2026-04-01' },
        { id: '2', title: 'b', surface: 's', difficulty: 'easy', starLevel: 1, status: 'approved', createdAt: '2026-04-01' },
        { id: '3', title: 'c', surface: 's', difficulty: 'easy', starLevel: 1, status: 'pending', createdAt: '2026-04-01' }
      ],
      pagination: { page: 1, limit: 10, total: 3, pages: 1 }
    })

    render(
      <MemoryRouter>
        <Contribute />
      </MemoryRouter>
    )

    const historyTab = screen.getByRole('button', { name: /我的投稿/i })
    historyTab.click()

    await waitFor(() => {
      expect(screen.getByText('累计采纳')).toBeInTheDocument()
    })

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('新锐创作者')).toBeInTheDocument()
  })
})
