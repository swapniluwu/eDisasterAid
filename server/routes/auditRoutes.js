const express = require('express');
const {
  getAuditLogs,
  getAuditLogById,
  getAuditStats,
} = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/', getAuditLogs);
router.get('/stats', getAuditStats);
router.get('/:id', getAuditLogById);

module.exports = router;