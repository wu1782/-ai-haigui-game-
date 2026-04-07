/**
 * 故事评论数据层
 */

export interface StoryComment {
  id: string
  storyId: string
  content: string
  author: string
  createdAt: string
  likes: number
}

const getCommentsKey = (storyId: string) => `turtle-soup-comments:${storyId}`

/**
 * 获取故事的评论
 */
export function getComments(storyId: string): StoryComment[] {
  try {
    const saved = localStorage.getItem(getCommentsKey(storyId))
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

/**
 * 添加评论
 */
export function addComment(storyId: string, content: string, author: string = '匿名用户'): StoryComment {
  const comments = getComments(storyId)
  const newComment: StoryComment = {
    id: `comment-${Date.now()}`,
    storyId,
    content,
    author,
    createdAt: new Date().toISOString(),
    likes: 0
  }
  comments.unshift(newComment) // 最新在前
  localStorage.setItem(getCommentsKey(storyId), JSON.stringify(comments))
  return newComment
}

/**
 * 删除评论
 */
export function deleteComment(storyId: string, commentId: string): void {
  const comments = getComments(storyId).filter(c => c.id !== commentId)
  localStorage.setItem(getCommentsKey(storyId), JSON.stringify(comments))
}

/**
 * 点赞评论
 */
export function likeComment(storyId: string, commentId: string): void {
  const comments = getComments(storyId)
  const comment = comments.find(c => c.id === commentId)
  if (comment) {
    comment.likes++
    localStorage.setItem(getCommentsKey(storyId), JSON.stringify(comments))
  }
}

/**
 * 获取评论数量
 */
export function getCommentCount(storyId: string): number {
  return getComments(storyId).length
}
