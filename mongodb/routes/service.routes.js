import express from 'express'
import {
    getAllServices,
    createService,
    getServiceById,
    updateService,
    deleteService,
} from '../controllers/service.controller.js';

const router=express.Router();

router.route('/').get(getAllServices);
router.route('/:id').get(getServiceById);
router.route('/').post(createService);
router.route('/:id').patch(updateService);
router.route('/:id').delete(deleteService);

export default router;

