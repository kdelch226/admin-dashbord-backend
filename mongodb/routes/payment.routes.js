import express from 'express';
import {
    getAllPayments,
    getPaymentByID,
    creatPayments,
    updatedPayments,
    getPaymentCurrentMonthCompareLastMonth,
    getPaymentYearStatistics
} from '../controllers/payment.controller.js';

const router =express.Router();

router.route('/currentmonth').get(getPaymentCurrentMonthCompareLastMonth);
router.route('/year').get(getPaymentYearStatistics);
router.route('/').get(getAllPayments);
router.route('/:id').get(getPaymentByID);
router.route('/').post(creatPayments);
router.route('/:id').patch(updatedPayments);

export default router;
