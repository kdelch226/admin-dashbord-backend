import express from 'express';
import {
    getAllEvents,
    getEventByID,
    creatEvents,
    updatedEvents,
    deleteEvent,
    removeClientFromEvent,
    removeEmployeFromEvent
} from '../controllers/event.controller.js';

const router = express.Router();


router.route('/').get(getAllEvents);
router.route('/:id').get(getEventByID);
router.route('/').post(creatEvents);
router.route('/:id').patch(updatedEvents);
router.route('/:id').delete(deleteEvent);
router.route('/:eventId/removeclient/:id')
    .delete(removeClientFromEvent);

router.route('/:eventId/removeemploye/:id')
    .delete(removeEmployeFromEvent);


export default router;
