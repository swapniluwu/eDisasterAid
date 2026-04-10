const express = require('express');
const {
  getDashboard,
  getPlatformOverview,
  getClosureReport,
  getMyNotifications,
  markNotificationsRead,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

router.get('/overview', authorize('admin'), getPlatformOverview);
router.get('/dashboard/:disasterId', authorize('admin'), getDashboard);
router.get('/report/:disasterId', authorize('admin', 'ngo'), getClosureReport);
router.get('/notifications', getMyNotifications);
router.patch('/notifications/read', markNotificationsRead);

module.exports = router;