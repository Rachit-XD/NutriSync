require('dotenv').config()
const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const authMiddleware = require('./middleware/auth')
const preferencesRouter = require('./routes/preferences')

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

app.use(express.json())

// Rate limit all /api/* routes: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
})
app.use('/api', apiLimiter)

// Public routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// All /api/* routes require a valid Supabase JWT
app.use('/api', authMiddleware)
app.use('/api/preferences', preferencesRouter)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Error handler — 4 params required for Express to recognize as error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

module.exports = app
