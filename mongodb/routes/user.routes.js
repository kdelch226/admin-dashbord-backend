import express from 'express';
import { getAllUsers,
    getUserById,
    updatedUser,
} from '../controllers/user.controller.js';

const router=express.Router();

router.route('/').get(getAllUsers);
router.route('/:id').get(getUserById);
router.route('/:id').patch(updatedUser);
router.route('/:id').put(updatedUser)


export default router;