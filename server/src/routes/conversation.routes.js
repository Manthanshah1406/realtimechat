const { Router } = require('express');
const {
  createConversation,
  getConversations,
  getConversationById,
  addMember,
  removeMember,
  leaveConversation,
  promoteToAdmin,
} = require('../controllers/conversation.controller');
const { authMiddleware } = require('../middleware/auth');
const { validate, createConversationSchema } = require('../middleware/validate');

const router = Router();
router.use(authMiddleware);

router.get('/',    getConversations);
router.post('/',   validate(createConversationSchema), createConversation);
router.get('/:id', getConversationById);

router.post(  '/:id/members',              addMember);
router.delete('/:id/members/:userId',      removeMember);
router.patch( '/:id/members/:userId/role', promoteToAdmin);
router.delete('/:id/leave',                leaveConversation);

module.exports = router;
