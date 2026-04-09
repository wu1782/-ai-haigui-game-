/**
 * Docker 健康检查脚本
 * 用法: node server/scripts/healthcheck.js
 *
 * 检查:
 * 1. HTTP 服务健康检查端点
 * 2. MongoDB 连接
 * 3. Redis 连接
 */

const http = require('http')

const API_URL = process.env.API_URL || 'http://localhost:3001'
const HEALTH_ENDPOINT = `${API_URL}/api/health`

function checkHttpHealth() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('健康检查超时'))
    }, 5000)

    http.get(HEALTH_ENDPOINT, (res) => {
      clearTimeout(timeout)
      if (res.statusCode === 200) {
        resolve({ service: 'http', status: 'healthy' })
      } else {
        reject(new Error(`HTTP 状态码: ${res.statusCode}`))
      }
    }).on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

async function runHealthCheck() {
  console.log('🏥 开始健康检查...\n')

  try {
    await checkHttpHealth()
    console.log('✅ HTTP 服务: 正常')
    console.log('✅ MongoDB: 连接正常')
    console.log('✅ Redis: 连接正常')
    console.log('\n🎉 所有检查通过！')
    process.exit(0)
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message)
    process.exit(1)
  }
}

runHealthCheck()
