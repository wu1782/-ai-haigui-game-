import { useState } from 'react'

interface RatingStarsProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  label?: string
}

/**
 * 星级评分组件
 */
export default function RatingStars({
  value,
  onChange,
  readonly = false,
  size = 'md',
  label
}: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
      )}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = hoverValue ? star <= hoverValue : star <= value
          return (
            <button
              key={star}
              type="button"
              disabled={readonly}
              onClick={() => handleClick(star)}
              onMouseEnter={() => !readonly && setHoverValue(star)}
              onMouseLeave={() => !readonly && setHoverValue(0)}
              className={`${sizeClasses[size]} transition-transform duration-100
                ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}
                ${filled ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}
              `}
            >
              ★
            </button>
          )
        })}
      </div>
    </div>
  )
}
