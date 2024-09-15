import express from 'express';
import {
    getAllClients,
    getClientByID,
    creatClients,
    updatedClients
} from '../controllers/client.controller.js';

const router =express.Router();


router.route('/').get(getAllClients);
router.route('/:id').get(getClientByID);
router.route('/').post(creatClients);
router.route('/:id').patch(updatedClients);

export default router;
