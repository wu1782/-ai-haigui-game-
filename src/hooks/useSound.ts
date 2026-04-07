/**
 * 音效 Hook - 使用 Web Audio API 生成程序化音效
 */
import { useCallback, useRef, useEffect } from 'react'
import { getUserSettings } from '../data/userData'

type SoundType = 'send' | 'receive' | 'victory' | 'defeat' | 'click' | 'panel'

// 音效配置：频率(Hz), 持续时间(ms), 波形类型
const soundConfigs: Record<SoundType, { frequency: number; duration: number; type: OscillatorType; volume: number }> = {
  send: { frequency: 600, duration: 80, type: 'sine', volume: 0.25 },
  receive: { frequency: 400, duration: 100, type: 'sine', volume: 0.2 },
  victory: { frequency: 800, duration: 250, type: 'triangle', volume: 0.3 },
  defeat: { frequency: 200, duration: 350, type: 'sawtooth', volume: 0.2 },
  click: { frequency: 500, duration: 50, type: 'sine', volume: 0.15 },
  panel: { frequency: 300, duration: 60, type: 'sine', volume: 0.15 },
}

export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const settingsRef = useRef(getUserSettings())

  // 刷新设置
  const refreshSettings = useCallback(() => {
    settingsRef.current = getUserSettings()
  }, [])

  // 获取或创建 AudioContext
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    // 如果状态被挂起，恢复它
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  // 播放音效
  const playSound = useCallback((type: SoundType) => {
    if (!settingsRef.current.soundEnabled) return

    const { frequency, duration, type: oscillatorType, volume } = soundConfigs[type]
    const finalVolume = (settingsRef.current.volume / 100) * volume

    try {
      const ctx = getAudioContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      oscillator.frequency.value = frequency
      oscillator.type = oscillatorType

      gainNode.gain.setValueAtTime(finalVolume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration / 1000)
    } catch (e) {
      // 静默失败，不影响用户体验
    }
  }, [getAudioContext])

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
    }
  }, [])

  return { playSound, refreshSettings }
}
