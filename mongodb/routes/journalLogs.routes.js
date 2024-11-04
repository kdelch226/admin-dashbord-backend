import express from 'express';
import { getAllAuditsLogs, getAuditsLogByID } from '../controllers/journalLogs.controller.js';


const router = express.Router();

router.route('/').get(getAllAuditsLogs);
router.route('/:id').get(getAuditsLogByID);

export default router;