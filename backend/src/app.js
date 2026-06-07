require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

app.use(express.json())

// Public routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

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
