import express from 'express';
import {    handleLogin,handleLogout
} from '../controllers/user.controller.js'
const router =express.Router()

router.route('/login').post(handleLogin);
router.route('/logout').post(handleLogout);

export default router
