import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'node:path'

const logsDir = path.resolve(__dirname, 'logs')

/** 开发环境：接收战斗日志 POST 请求，覆盖写入 logs/last-battle.json */
function battleLogPlugin() {
  return {
    name: 'battle-log',
    configureServer(server) {
      server.middlewares.use('/dev/save-log', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const log = JSON.parse(body)
            fs.mkdirSync(logsDir, { recursive: true })
            // 始终覆盖同一文件，只保留最近一局
            const file = path.join(logsDir, 'last-battle.json')
            fs.writeFileSync(file, JSON.stringify(log, null, 2), 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true, file }))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ ok: false, error: e.message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), battleLogPlugin()],
  publicDir: 'public',
  base: './',
})
