const express = require('express');

const {
  login,
  logout,
  me,
} = require('../controllers/authController');

const router = express.Router();

router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/auth/me', me);

module.exports = router;