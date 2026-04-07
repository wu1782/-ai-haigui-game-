/**
 * 分享工具函数
 */
import type { TStory } from '../types'

export interface ShareData {
  story: TStory
  questionCount: number
  isWin: boolean
  elapsedTime?: number
  elapsedTimeFormatted?: string
}

/**
 * 生成分享文案
 */
export function generateShareText(data: ShareData): string {
  const { story, questionCount, isWin, elapsedTimeFormatted } = data
  const timeStr = elapsedTimeFormatted ? `用时${elapsedTimeFormatted}` : ''

  if (isWin) {
    return `我在AI海龟汤「${story.title}」中用了${questionCount}次提问成功破案！${timeStr}

用逻辑穿透迷雾，让真相浮出水面。

难度：${story.difficulty === 'easy' ? '入门' : story.difficulty === 'medium' ? '中等' : story.difficulty === 'hard' ? '困难' : '极难'}（${story.starLevel}星）

#海龟汤 #推理游戏`
  } else {
    return `我在AI海龟汤「${story.title}」中尝试了${questionCount}次提问，虽然没有破案但故事很有趣！

难度：${story.difficulty === 'easy' ? '入门' : story.difficulty === 'medium' ? '中等' : story.difficulty === 'hard' ? '困难' : '极难'}（${story.starLevel}星）

#海龟汤 #推理游戏`
  }
}

/**
 * 分享到剪贴板
 */
export async function shareToClipboard(data: ShareData): Promise<boolean> {
  const text = generateShareText(data)
  const url = `${window.location.origin}/game/${data.story.id}`

  try {
    await navigator.clipboard.writeText(`${text}\n\n游戏链接: ${url}`)
    return true
  } catch {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = `${text}\n\n游戏链接: ${url}`
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    return true
  }
}

/**
 * 分享到微博
 */
export function shareToWeibo(data: ShareData): void {
  const text = generateShareText(data)
  const url = `${window.location.origin}/game/${data.story.id}`
  const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`
  window.open(weiboUrl, '_blank', 'width=550,height=450')
}

/**
 * 分享到微信（生成二维码提示）
 */
export function shareToWeChat(data: ShareData): string {
  // 返回分享文本，用于显示给用户
  return generateShareText(data)
}
