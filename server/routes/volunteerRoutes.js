const express = require('express');
const { body } = require('express-validator');
const {
  getAllVolunteers,
  getVolunteerById,
  assignZone,
  updateSkillTags,
  getAvailableVolunteers,
  getMyDashboard,
  getMyTasks,
} = require('../controllers/volunteerController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

// Volunteer-only routes (specific first)
router.get('/my-dashboard', authorize('volunteer'), getMyDashboard);
router.get('/my-tasks', authorize('volunteer'), getMyTasks);

// Admin routes
router.get('/available/:disasterId', authorize('admin'), getAvailableVolunteers);
router.get('/', authorize('admin'), getAllVolunteers);
router.get('/:id', authorize('admin'), getVolunteerById);
router.patch('/:id/zone', authorize('admin'), [
  body('region').trim().notEmpty().withMessage('Region is required'),
], assignZone);
router.patch('/:id/skills', authorize('admin'), [
  body('skillTags').isArray().withMessage('skillTags must be an array'),
], updateSkillTags);

module.exports = router;