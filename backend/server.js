require('dotenv').config()
const app = require('./src/app')

const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
const missing = REQUIRED_ENV.filter(k => !process.env[k])
if (missing.length) {
  console.error(`Missing required env vars: ${missing.join(', ')}`)
  process.exit(1)
}

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`NutriSync API running on port ${PORT}`)
})
