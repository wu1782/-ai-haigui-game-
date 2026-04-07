/**
 * 用户数据类型定义
 */

// 段位信息
export interface UserRank {
  level: number          // 等级 1-10
  title: string          // 段位名称
  minWins: number        // 最低胜场要求
  icon: string           // 图标
}

// 成就定义
export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  condition: string     // 解锁条件描述
  type: 'win' | 'play' | 'streak' | 'special' | 'difficulty'  // 成就类型
}

// 用户统计
export interface UserStats {
  totalGames: number      // 总游戏次数
  totalWins: number       // 总胜利次数
  totalLosses: number    // 总失败次数
  currentStreak: number   // 当前连胜
  bestStreak: number      // 最高连胜
  winRate: number         // 胜率（百分比）
  perfectGames: number    // 完美破案（5次以内）
  achievements: string[]  // 已解锁成就ID列表
  rank: number            // 当前等级
  lastPlayedAt?: string   // 最后游戏时间
}

// 用户设置
export interface UserSettings {
  soundEnabled: boolean   // 音效开关
  volume: number          // 音量 0-100
  theme: 'dark' | 'light' // 主题
  animationSpeed: 'normal' | 'fast' | 'instant' // 动画速度
}

// 段位配置
export const RANKS: UserRank[] = [
  { level: 1, title: '汤新人', minWins: 0, icon: '🌱' },
  { level: 2, title: '汤学徒', minWins: 3, icon: '📖' },
  { level: 3, title: '汤弟子', minWins: 10, icon: '🎯' },
  { level: 4, title: '汤高手', minWins: 20, icon: '⚔️' },
  { level: 5, title: '汤专家', minWins: 35, icon: '🧩' },
  { level: 6, title: '汤大师', minWins: 50, icon: '🎭' },
  { level: 7, title: '汤宗师', minWins: 75, icon: '🔮' },
  { level: 8, title: '汤传奇', minWins: 100, icon: '👑' },
  { level: 9, title: '汤神话', minWins: 150, icon: '🌟' },
  { level: 10, title: '汤圣', minWins: 200, icon: '💫' },
]

// 成就列表
export const ACHIEVEMENTS: Achievement[] = [
  // 基础成就
  {
    id: 'first_win',
    title: '初露锋芒',
    description: '赢得第一场游戏',
    icon: '🌱',
    condition: '胜利1次',
    type: 'win',
  },
  {
    id: 'win_10',
    title: '小有成就',
    description: '累计胜利10次',
    icon: '🎯',
    condition: '胜利10次',
    type: 'win',
  },
  {
    id: 'win_streak_3',
    title: '三连胜',
    description: '实现3连胜',
    icon: '🔥',
    condition: '连胜3次',
    type: 'streak',
  },
  {
    id: 'win_streak_5',
    title: '五福临门',
    description: '实现5连胜',
    icon: '⭐',
    condition: '连胜5次',
    type: 'streak',
  },
  {
    id: 'play_20',
    title: '海龟汤爱好者',
    description: '累计游戏20次',
    icon: '🐢',
    condition: '游戏20次',
    type: 'play',
  },
  {
    id: 'perfect_5',
    title: '神机妙算',
    description: '5次提问内破案',
    icon: '🧠',
    condition: '5次内破案',
    type: 'special',
  },
  {
    id: 'win_50',
    title: '推理大师',
    description: '累计胜利50次',
    icon: '🏆',
    condition: '胜利50次',
    type: 'win',
  },
  // 难度成就
  {
    id: 'easy_clear',
    title: '初出茅庐',
    description: '入门难度通关',
    icon: '🌱',
    condition: '入门难度通关1次',
    type: 'difficulty',
  },
  {
    id: 'medium_clear',
    title: '小试牛刀',
    description: '中等难度通关',
    icon: '⚔️',
    condition: '中等难度通关1次',
    type: 'difficulty',
  },
  {
    id: 'hard_clear',
    title: '过关斩将',
    description: '困难难度通关',
    icon: '🗡️',
    condition: '困难难度通关1次',
    type: 'difficulty',
  },
  {
    id: 'extreme_clear',
    title: '极限挑战',
    description: '极难难度通关',
    icon: '💀',
    condition: '极难难度通关1次',
    type: 'difficulty',
  },
  // 提问数成就
  {
    id: 'question_3',
    title: '一击即中',
    description: '3次提问内破案',
    icon: '🎯',
    condition: '3次内破案',
    type: 'special',
  },
  {
    id: 'question_10',
    title: '持之以恒',
    description: '20次提问内破案',
    icon: '💪',
    condition: '20次内破案',
    type: 'special',
  },
  // 收藏/回放成就
  {
    id: 'favorite_10',
    title: '收藏夹满了',
    description: '收藏10个故事',
    icon: '📚',
    condition: '收藏10个故事',
    type: 'special',
  },
  {
    id: 'replay_5',
    title: '温故知新',
    description: '回放5次游戏',
    icon: '🔄',
    condition: '回放5次游戏',
    type: 'special',
  },
]
