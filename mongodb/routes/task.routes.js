import express from 'express';
import {
    getAllTasks,
    getTaskByID,
    createTasks,
    updatedTasks
} from '../controllers/task.controller.js';

const router =express.Router();


router.route('/').get(getAllTasks);
router.route('/:id').get(getTaskByID);
router.route('/').post(createTasks);
router.route('/:id').patch(updatedTasks);
router.route('/:id').put(updatedTasks);


export default router;
