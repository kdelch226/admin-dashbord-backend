import express from 'express';
import {
    getAllAudits,
    getAuditByID
} from '../controllers/activities.controller.js';

const router = express.Router();

router.route('/').get(getAllAudits);
router.route('/:id').get(getAuditByID);

export default router;