const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables first
dotenv.config();

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Import all route files
const authRoutes = require('./routes/authRoutes');
const disasterRoutes = require('./routes/disasterRoutes');
const victimRoutes = require('./routes/victimRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const distributionRoutes = require('./routes/distributionRoutes');
const volunteerRoutes = require('./routes/volunteerRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const auditRoutes = require('./routes/auditRoutes');
const donationRoutes = require('./routes/donationRoutes');

// Connect to MongoDB
connectDB();

const app = express();

// ─── Security & Utility Middleware ───
app.use(helmet());   // Sets secure HTTP headers
app.use(cors({ origin: true, credentials: true }));     // Allow authenticated cross-origin requests
app.use(express.json());           // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// HTTP request logger (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Health Check Route ───
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'e-DisasterAid API is running' });
});

// ─── API Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/disasters', disasterRoutes);
app.use('/api/victims', victimRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/distributions', distributionRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/donations', donationRoutes);

// ─── Error Handling Middleware (must be last) ───
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});