import express from 'express';
import {
    getAllTasks,
    getTaskByID,
    createTasks,
    updatedTasks,
    deleteTask,
    removeprojectFromTask,
    removeEmployeFromTask,
    getTaskStatistics
} from '../controllers/task.controller.js';

const router =express.Router();

router.route('/statistics')
    .get(getTaskStatistics);

router.route('/').get(getAllTasks);
router.route('/:id').get(getTaskByID);
router.route('/').post(createTasks);
router.route('/:id').patch(updatedTasks);
router.route('/:id').put(updatedTasks);
router.route('/:id').delete(deleteTask);

router.route('/:taskId/removeproject/:id')
    .delete(removeprojectFromTask);

router.route('/:taskId/removeemploye/:id')
    .delete(removeEmployeFromTask);



export default router;
