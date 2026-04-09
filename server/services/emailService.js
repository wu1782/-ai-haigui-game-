// 邮件服务 - 发送验证邮件和密码重置邮件
// 支持 nodemailer，线上需配置 SMTP 环境变量

import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

// 邮件配置（nodemailer）
let transporter = null

async function initTransporter() {
  if (transporter) return transporter

  // 仅当配置了 SMTP 时才初始化真实发送
  if (process.env.SMTP_HOST) {
    try {
      const nodemailer = await import('nodemailer')
      transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })
      console.log('[Email] SMTP transporter initialized')
    } catch (e) {
      console.warn('[Email] Failed to init SMTP transporter:', e.message)
    }
  }
  return transporter
}

// 邮件模板
function wrapHtml(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; }
    .container { background: #f9f9f9; border-radius: 8px; padding: 24px; }
    .btn { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0; }
    .footer { margin-top: 24px; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">— AI 海龟汤游戏团队</div>
  </div>
</body>
</html>`
}

// 验证邮件内容
function buildVerifyEmailHtml(username, verifyUrl) {
  return wrapHtml(`
    <h2>你好，${username}！</h2>
    <p>感谢注册 AI 海龟汤游戏，请点击下方按钮验证您的邮箱：</p>
    <a href="${verifyUrl}" class="btn">验证邮箱</a>
    <p>如果按钮无法点击，请复制以下链接到浏览器打开：</p>
    <p style="word-break:break-all;font-size:12px;color:#666">${verifyUrl}</p>
    <p>此链接 <strong>24小时</strong> 后失效。</p>
  `)
}

// 密码重置邮件内容
function buildResetPasswordHtml(username, resetUrl) {
  return wrapHtml(`
    <h2>你好，${username}！</h2>
    <p>我们收到了您的密码重置请求，如果不是您本人操作，请忽略此邮件。</p>
    <a href="${resetUrl}" class="btn">重置密码</a>
    <p>如果按钮无法点击，请复制以下链接到浏览器打开：</p>
    <p style="word-break:break-all;font-size:12px;color:#666">${resetUrl}</p>
    <p>此链接 <strong>1小时</strong> 后失效，且只能使用一次。</p>
  `)
}

/**
 * 发送验证邮件
 * @param {string} to - 目标邮箱
 * @param {string} username - 用户名
 * @param {string} odId - 用户 odId
 */
export async function sendVerificationEmail(to, username, odId) {
  const token = jwt.sign({ odId, type: 'verify', to }, JWT_SECRET, { expiresIn: '24h' })
  const baseUrl = process.env.APP_URL || 'http://localhost:5173'
  const verifyUrl = `${baseUrl}/auth/verify?token=${token}`

  const html = buildVerifyEmailHtml(username, verifyUrl)

  // 开发环境直接打印
  if (!process.env.SMTP_HOST) {
    console.log(`[Email] ===== 验证邮件 (开发模式) =====`)
    console.log(`To: ${to}`)
    console.log(`URL: ${verifyUrl}`)
    console.log(`======================================`)
    return { success: true, token } // 返回 token 便于测试
  }

  await initTransporter()
  if (!transporter) {
    console.warn('[Email] SMTP not configured, skipping email send')
    return { success: false, error: 'SMTP not configured' }
  }

  try {
    await transporter.sendMail({
      from: `"AI 海龟汤" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: '【AI 海龟汤】验证您的邮箱',
      html
    })
    return { success: true }
  } catch (e) {
    console.error('[Email] Send failed:', e.message)
    return { success: false, error: e.message }
  }
}

/**
 * 发送密码重置邮件
 * @param {string} to - 目标邮箱
 * @param {string} username - 用户名
 * @param {string} odId - 用户 odId
 */
export async function sendPasswordResetEmail(to, username, odId) {
  const token = jwt.sign({ odId, type: 'reset', to }, JWT_SECRET, { expiresIn: '1h' })
  const baseUrl = process.env.APP_URL || 'http://localhost:5173'
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

  const html = buildResetPasswordHtml(username, resetUrl)

  if (!process.env.SMTP_HOST) {
    console.log(`[Email] ===== 密码重置邮件 (开发模式) =====`)
    console.log(`To: ${to}`)
    console.log(`URL: ${resetUrl}`)
    console.log(`==========================================`)
    return { success: true, token }
  }

  await initTransporter()
  if (!transporter) {
    console.warn('[Email] SMTP not configured, skipping email send')
    return { success: false, error: 'SMTP not configured' }
  }

  try {
    await transporter.sendMail({
      from: `"AI 海龟汤" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: '【AI 海龟汤】密码重置请求',
      html
    })
    return { success: true }
  } catch (e) {
    console.error('[Email] Send failed:', e.message)
    return { success: false, error: e.message }
  }
}

/**
 * 验证邮箱验证 Token
 */
export function verifyEmailToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.type !== 'verify') return null
    return decoded
  } catch {
    return null
  }
}

/**
 * 验证密码重置 Token
 */
export function verifyResetToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (decoded.type !== 'reset') return null
    return decoded
  } catch {
    return null
  }
}
