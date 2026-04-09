import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Leaderboard from './Leaderboard'

const mockGetLeaderboard = vi.fn()

vi.mock('../data/leaderboard', () => ({
  getLeaderboard: (...args: unknown[]) => mockGetLeaderboard(...args)
}))

describe('Leaderboard seasonal filtering', () => {
  beforeEach(() => {
    mockGetLeaderboard.mockReset()
  })

  it('filters out outdated entries in weekly mode and keeps them in monthly mode', async () => {
    const now = Date.now()
    const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString()
    const twentyDaysAgo = new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString()

    mockGetLeaderboard.mockResolvedValue([
      { rank: 1, playerName: 'Alice', value: 10, date: '2026-04-01', createdAt: threeDaysAgo },
      { rank: 2, playerName: 'Bob', value: 20, date: '2026-03-15', createdAt: twentyDaysAgo }
    ])

    render(
      <MemoryRouter>
        <Leaderboard />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    // 周榜默认开启，应过滤20天前数据
    expect(screen.queryByText('Bob')).not.toBeInTheDocument()

    // 切换到月榜后应出现 Bob
    const monthlyButton = screen.getByRole('button', { name: '月榜' })
    monthlyButton.click()

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })
})
