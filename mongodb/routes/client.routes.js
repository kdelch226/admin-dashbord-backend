import express from 'express';
import {
    getAllClients,
    getClientByID,
    creatClients,
    updatedClients,
    getClientStatistique
} from '../controllers/client.controller.js';

const router =express.Router();

router.route('/statistics').get(getClientStatistique)
router.route('/').get(getAllClients);
router.route('/:id').get(getClientByID);
router.route('/').post(creatClients);
router.route('/:id').patch(updatedClients);

export default router;
