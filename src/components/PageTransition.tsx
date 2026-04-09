import { type ReactNode, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

/**
 * 页面过渡动画组件
 * 使用CSS过渡实现平滑的页面切换效果
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(false)
  const [displayLocation, setDisplayLocation] = useState(location)

  // 路由变化时触发动画
  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      // 开始退出动画
      setIsVisible(false)

      // 等待动画完成后切换路由
      const timer = setTimeout(() => {
        setDisplayLocation(location)
        // 下一帧开始进入动画
        requestAnimationFrame(() => {
          setIsVisible(true)
        })
      }, 150) // 匹配CSS的150ms ease-out

      return () => clearTimeout(timer)
    }
  }, [location, displayLocation])

  // 初始加载时也触发动画
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`page-transition ${isVisible ? 'page-transition-visible' : 'page-transition-hidden'} ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * 淡入过渡动画
 */
export function FadeIn({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={`transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * 交错出现动画 - 用于列表项
 */
export function StaggeredList({
  children,
  className = '',
  staggerDelay = 50
}: {
  children: ReactNode
  className?: string
  staggerDelay?: number
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      {Array.isArray(children)
        ? children.map((child, index) => (
          <div
            key={index}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * staggerDelay}ms` }}
          >
            {child}
          </div>
        ))
        : children
      }
    </div>
  )
}

/**
 * 滑入动画
 */
export function SlideIn({
  children,
  direction = 'right',
  className = ''
}: {
  children: ReactNode
  direction?: 'left' | 'right' | 'up' | 'down'
  className?: string
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const transform = {
    left: visible ? 'translate-x-0' : 'translate-x-full',
    right: visible ? 'translate-x-0' : '-translate-x-full',
    up: visible ? 'translate-y-0' : 'translate-y-full',
    down: visible ? 'translate-y-0' : '-translate-y-full'
  }

  return (
    <div className={`transition-transform duration-300 ease-out ${transform[direction]} ${className}`}>
      {children}
    </div>
  )
}
