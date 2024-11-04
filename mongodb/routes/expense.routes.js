import express from 'express';
import {
    getProfitByweekOnMonth,
    getAllExpenses,
    getExpenseByID,
    creatExpenses,
    updatedExpenses,
    getExpenseCurrentMonthCompareLastMonth,
    getExpenseYearStatistics
} from '../controllers/expense.controller.js';

const router = express.Router();

router.route('/profitcurrentmonth').get(getProfitByweekOnMonth);
router.route('/currentmonth').get(getExpenseCurrentMonthCompareLastMonth);
router.route('/year').get(getExpenseYearStatistics);
router.route('/').get(getAllExpenses);
router.route('/:id').get(getExpenseByID);
router.route('/').post(creatExpenses);
router.route('/:id').patch(updatedExpenses);

export default router;
