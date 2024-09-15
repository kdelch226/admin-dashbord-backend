import express from 'express';
import {
    getAllEmployes,
    getEmployeByID,
    creatEmployes,
    updatedEmployes
} from '../controllers/employe.controller.js';

const router =express.Router();


router.route('/').get(getAllEmployes);
router.route('/:id').get(getEmployeByID);
router.route('/').post(creatEmployes);
router.route('/:id').patch(updatedEmployes);

export default router;
