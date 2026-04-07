/**
 * 主题切换组件 - 游戏化风格
 */
import { useTheme } from '../hooks/useTheme'

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2.5 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-700 dark:to-dark-800
                 hover:from-game-100 hover:to-game-200 dark:hover:from-game-700 dark:hover:to-game-800
                 border border-gray-200 dark:border-dark-600 hover:border-game-400 dark:hover:border-game-500
                 transition-all duration-300 active:scale-95 group overflow-hidden"
      title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
    >
      {/* 悬停光晕 */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-game-400/20 to-purple-400/20" />

      <div className="relative">
        {theme === 'dark' ? (
          <svg className="w-5 h-5 text-amber-500 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-700 group-hover:text-game-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </div>
    </button>
  )
}

export default ThemeToggle
