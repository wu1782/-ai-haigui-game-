import { useState, useEffect } from 'react'
import { isFavorite, toggleFavorite } from '../data/favorites'

interface FavoriteButtonProps {
  storyId: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

/**
 * 收藏按钮组件
 */
export default function FavoriteButton({ storyId, size = 'md', showText = false }: FavoriteButtonProps) {
  const [favorite, setFavorite] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    setFavorite(isFavorite(storyId))
  }, [storyId])

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newState = toggleFavorite(storyId)
    setFavorite(newState)
    setAnimating(true)
    setTimeout(() => setAnimating(false), 300)
  }

  const sizeClasses = {
    sm: 'w-7 h-7 text-sm',
    md: 'w-9 h-9 text-base',
    lg: 'w-11 h-11 text-lg'
  }

  return (
    <button
      onClick={handleClick}
      className={`${sizeClasses[size]} flex items-center justify-center rounded-full
        transition-all duration-200 hover:scale-110 active:scale-95
        ${favorite
          ? 'bg-red-100 dark:bg-red-500/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-500/30'
          : 'bg-gray-100 dark:bg-dark-600 text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-500'
        }
        ${animating ? 'animate-bounce' : ''}
      `}
      title={favorite ? '取消收藏' : '收藏'}
    >
      {favorite ? '❤️' : '🤍'}
      {showText && (
        <span className="ml-1.5 text-xs font-medium">
          {favorite ? '已收藏' : '收藏'}
        </span>
      )}
    </button>
  )
}
