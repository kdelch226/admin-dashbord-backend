import mongoose from 'mongoose';
import Expense from '../models/expense.js';
import Audit from '../models/audit.js'
import User from '../models/user.js';
import Task from '../models/task.js';
import Employe from '../models/employe.js';
import Project from '../models/project.js';
import Event from '../models/event.js';
import cron from 'node-cron'
import Payment from '../models/payment.js';
import updateAllRelevantObjectives from '../functions/updateAllRevelantObjectives.js';
import expense from '../models/expense.js';

const getAllExpenses = async (req, res) => {
    console.log('expense')
    try {
        const { _end, _order, _start, _sort, title_like = '', category_like = ''
        } = req.query;

        let query = {}
        if (title_like) {
            query.title = { $regex: title_like, $options: 'i' }
        }

        const sort = {};
        if (_sort && _order) {
            sort[_sort] = _order === 'desc' ? -1 : 1;
        } else {
            sort._id = 1;
        }

        const count = await Expense.countDocuments({ query })
        const expenses = await Expense
            .find(query)
            .limit(_end)
            .skip(_start)
            .sort(sort);

        res.header('x-total-count', count)
        res.header('Acces-Control-Expose-Headers', 'x-total-count')

        res.status(200).json(expenses)
    }
    catch (error) {
        console.log(error)
        res.status(500).json({ error })
    }
}

const getExpenseByID = async (req, res) => {
    const { id } = req.params;
    await Expense.findOne({ _id: id })
        .then((expense) => {
            if (!expense) res.status(404).json({ message: 'Expense not found' })
            else {
                res.status(200).json(expense)
            }
        })
        .catch((error) => {
            res.status(500).json({ error })
        });
}

const creatExpenses = async (req, res) => {
    const { title, amount, date, description, transactionMethod, recurrence, category, projectId, eventId, taskId, employeId } = req.body;
    console.log('request ', req.body)

    const userEmail = req.get('X-Email-Creator');
    const session = await mongoose.startSession();
    session.startTransaction();



    try {

        const user = await User.findOne({ email: userEmail }).session(session)
        if (!user) throw new Error('User not found');

        const relatedObject = {};
        const relatedObjectAttribut = {}

        if (projectId) {
            const projectExist = await Project.findOne({ id: projectId });
            if (!projectExist) return res.status(404).json({ message: 'project not found' })
            relatedObject = { project: projectId }
            relatedObjectAttribut = { projectTitle: projectExist.title, projectId: { projectId } }
        }
        if (employeId) {
            const employeExist = await Employe.findOne({ id: employeId });
            if (!employeExist) return res.status(404).json({ message: 'project not found' })
            relatedObject = { employe: employeId }
            relatedObjectAttribut = { employeName: employeExist.name, employeId: { employeId } }
        }
        if (eventId) {
            const eventExist = await Event.findOne({ id: eventId });
            if (!eventExist) return res.status(404).json({ message: 'event not found' })
            relatedObject = { event: eventId }
            relatedObjectAttribut = { eventTitle: eventExist.title, eventId: { eventId } }
        }
        if (taskId) {
            const taskExist = await Task.findOne({ id: taskId });
            if (!taskExist) return res.status(404).json({ message: 'task not found' })
            const relatedProject = [];
            taskExist.relatedProject.forEach(projet => {
                relatedProject.push(projet._id)
            })
            relatedObject = { task: taskId };
            relatedObjectAttribut = { taskTitle: taskExist.title, taskId: { taskId } }
        }


        // Create expense within the session
        const newExpense = new Expense({
            title,
            amount,
            date,
            description,
            transactionMethod,
            category,
            recurrence,
            ...relatedObject
        });

        await newExpense.save({ session });

        updateAllRelevantObjectives(date, 'expense')

        // Create audit log entry
        const auditLog = new Audit({
            action: 'create',
            documentId: newExpense._id,  // Use the created expense’s ID
            documentType: 'expense',        // Adjust the type to 'expense'
            changedBy: user.email,
            changes: {
                title, amount, date, description, transactionMethod, recurrence, category, relatedObjectAttribut
            },
            timestamp: new Date(),
        });

        // Save audit log within the same session
        await auditLog.save({ session });

        // Commit the transaction if all operations succeed
        await session.commitTransaction();
        res.status(201).json({ message: 'Expense created successfully' });
    } catch (error) {
        // Abort the transaction on error
        console.log(error)
        await session.abortTransaction();
        res.status(500).json({ error: 'Failed to create expense' });
    } finally {
        // End the session in any case (success or failure)
        session.endSession();
    }
};


const updatedExpenses = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const updatedData = req.body;

        // Update the expense document within the session
        const updatedExpense = await Expense.findByIdAndUpdate(
            id,
            { $set: updatedData },
            { new: true, runValidators: true, session }
        );

        if (!updatedExpense) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Expense not found' });
        }

        // Create an audit log entry within the session
        const auditLog = new Audit({
            action: 'update',
            documentId: id,
            documentType: 'expense',
            changedBy: req.user?.email || 'unknown', // Assuming you have a logged-in user
            changes: updatedData,
            timestamp: new Date(),
        });

        await auditLog.save({ session });

        updateAllRelevantObjectives(updatedExpense.date, 'expense')

        // Commit the transaction if both operations succeed
        await session.commitTransaction();
        res.status(200).json({ message: 'Expense updated successfully' });

    } catch (error) {
        // Abort the transaction on error
        await session.abortTransaction();
        res.status(500).json({ error: 'Failed to update expense' });

    } finally {
        // End the session in any case (success or failure)
        session.endSession();
    }
};

const getExpenseYearStatistics = async (req, res) => {
    const currentYear = new Date().getFullYear();

    // Predefined months array initialized with zero
    const months = Array(12).fill(0); // [0,0,0,....]
    try {
        // Récupérer le nombre total de expense
        const monthlyExpenses = await Expense.aggregate([
            {
                $match: {
                    date: {
                        $gte: new Date(`${currentYear}-01-01`),
                        $lt: new Date(`${currentYear + 1}-01-01`)
                    }
                },
            }, {
                $group: {
                    _id: { $month: '$date' },
                    total: { $sum: '$amount' }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        monthlyExpenses.forEach(expense => {
            const monthIndex = expense._id;
            months[monthIndex] = expense.total;
        })

        res.status(200).json(months)

    } catch (error) {
        console.log('expense monthly stat ', error)
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
}

const getExpenseCurrentMonthCompareLastMonth = async (req, res) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-11 for Jan-Dec
    const currentYear = currentDate.getFullYear();

    const firstDayCurrentMonth = new Date(currentYear, currentMonth, 1);
    const firstDayLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const firstDayNextMonth = new Date(currentYear, currentMonth + 1, 1);

    try {
        const expenses = await Expense.aggregate([
            {
                $match: {
                    $or: [{
                        date: {
                            $gte: firstDayLastMonth,
                            $lt: firstDayNextMonth
                        }
                    }]
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                    },
                    total: { $sum: '$amount' }
                }
            }
        ]);

        let currentMonthTotal = 0;
        let lastMonthTotal = 0;

        expenses.forEach(expense => {
            const month = expense._id.month;
            if (month === currentMonth + 1) {
                currentMonthTotal = expense.total
            }
            else if (month === currentMonth) { // Previous month in 0-indexed format
                lastMonthTotal = expense.total; // Store total for the last month
            }
        })

        const differencePercentage = lastMonthTotal ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 100;

        res.status(200).json({
            currentMonth: currentMonthTotal,
            lastMonth: lastMonthTotal,
            differencePercentage: differencePercentage,
            difference: (currentMonthTotal - lastMonthTotal)
        })
    } catch (error) {
        // console.log('expense month compare last month ', error)
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
}

const getWeekNumberInMonth = (day) => {
    const date = new Date();
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstWeekend = firstDayOfMonth.getDay() === 0 ? firstDayOfMonth : new Date(firstDayOfMonth.setDate(firstDayOfMonth.getDate() + (7 - firstDayOfMonth.getDay())));

    // Récupérer la date de fin du mois
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const lastDay = endOfMonth.getDate();


    const weekEnds = [];
    for (let i = firstWeekend.getDate(); i <= lastDay; i += 7) {
        weekEnds.push(i);
    }

    // Trouver à quelle semaine appartient la date
    for (let weekNumber = 0; weekNumber < weekEnds.length; weekNumber++) {
        if (day <= weekEnds[weekNumber]) {
            return weekNumber; // Les semaines commencent à 0
        }
    }

    return Math.ceil(lastDay / 7); // Retourne le nombre total de semaines si la date est après le dernier week-end
};

const getProfitByweekOnMonth = async (req, res) => {
    const { month } = req.query; // Récupérer le mois de la requête
    const currentDate = new Date(); // Obtenir la date actuelle
    const monthToQuery = month ? parseInt(month, 10) : currentDate.getMonth(); // Convertir le mois en nombre ou utiliser le mois actuel
    const year = currentDate.getFullYear(); // Récupérer l'année actuelle

    try {
        // Aggregation pour les dépenses par semaine
        const expenseByDay = await Expense.aggregate([
            {
                $match: {
                    date: {
                        $gte: new Date(year, monthToQuery, 1), // First day of the month
                        $lt: new Date(year, monthToQuery + 1, 1) // First day of the next month
                    }
                }
            },
            {
                $group: {
                    _id: { $dayOfMonth: "$date" }, // Number of the day in the month
                    amount: { $sum: '$amount' } // Sum the expenses for that week
                }
            },
            {
                $sort: { _id: 1 } // Sort by week number in ascending order
            }
        ]);

        // Aggregation pour les paiements par semaine
        const paymentByDay = await Payment.aggregate([
            {
                $match: {
                    date: {
                        $gte: new Date(year, monthToQuery, 1), // First day of the month
                        $lt: new Date(year, monthToQuery + 1, 1) // First day of the next month
                    }
                }
            },
            {
                $group: {
                    _id: { $dayOfMonth: "$date" }, // Number of the day in the month
                    amount: { $sum: '$amount' } // Sum the expenses for that week
                }
            },
            {
                $sort: { _id: 1 } // Sort by week number in ascending order
            }
        ]);

        console.log('expense result', expenseByDay); // Log the expenses by week
        console.log('payment result', paymentByDay); // Log the payments by week


        const maxInList = (listA, listB, key) => {
            const list = [...listA, ...listB];
            return Math.max(...list.map(item => item[key]))
        }

        const max = maxInList(expenseByDay, paymentByDay, '_id')
        // console.log('max ',max)
        // Initialiser un tableau pour stocker les expense and payment de chaque semaine
        let expenseByWeek = Array(max).fill(0);
        let paymentByWeek = Array(max).fill(0);
        let weeksProfit = Array(max).fill(0)

        expenseByDay.forEach((expense) => {
            const week = getWeekNumberInMonth(expense._id)
            // console.log('day ', expense._id, 'weeknumber ', week)
            expenseByWeek[week] += expense.amount
        })
        paymentByDay.forEach((payment) => {
            const week = getWeekNumberInMonth(payment._id)
            // console.log('day ', payment._id, 'weeknumber ', week)
            paymentByWeek[week] += payment.amount
        })

        for (let i = 0; i < weeksProfit.length; i++) {
            weeksProfit[i] = expenseByWeek[i] - paymentByWeek[i]
        }
        // console.log('weeksProfit ', weeksProfit)
        // Calculer le profit pour chaque semaine
        // Return the array of profits by week

        res.status(200).json({
            month: monthToQuery + 1, // Display the month as a number from 1 to 12
            year: year,
            profitsByWeek: weeksProfit, // Profits by week
        });

    } catch (error) {
        console.log('profitljjjjjjjjjjjj ', error); // Log any errors that occur
        res.status(500).json({ error: 'Erreur interne du serveur' }); // Return a server error response
    }
}



const generateRecurrencesExpenses = async () => {
    const recurrencesExpense = await Expense.find({
        "recurrence.frequency": { $exists: true },
        isCancelled: false,
        $or: [
            {
                $and: [
                    { "recurrence.occurrences": { $gt: 0 } },
                    { "recurrence.endDate": { $gte: new Date() } }
                ]
            },
            {
                $and: [
                    { "recurrence.endDate": { $exists: true, $gte: new Date() } },
                    { "recurrence.occurrences": { $exists: false } } // Si occurrences n'est pas défini
                ]
            },
            {
                $and: [
                    { "recurrence.occurrences": { $exists: true, $gt: 0 } },
                    { "recurrence.endDate": { $exists: false } } // Si endDate n'est pas défini
                ]
            }
        ],
    })

    for (const expense of recurrencesExpense) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const frequency = expense.recurrence;
            let nextDate = new Date(expense.date);

            // definition of next date paiement depending of last paiement eand frequency
            if (frequency === 'daily') {
                nextDate.setDate(nextDate.getDate() + 1);
            } else if (frequency === 'weekly') {
                nextDate.setDate(nextDate.getDate() + 7);
            } else if (frequency === 'monthly') {
                nextDate.setMonth(nextDate.getMonth() + 1);
            }

            const isToday = nextDate === new Date();
            const beforEndDate = expense.recurrence.endDate ? nextDate <= expense.recurrence.endDate : true;
            const occurencesleft = expense.recurrence.occurrences ? expense.recurrence.occurrences > 0 : true;

            if (isToday && beforEndDate && occurencesleft) {
                const { recurrence, ...expenseWhithoutOccurence } = expense;

                const newExpense = new Expense(
                    date = nextDate,
                    ...expenseWhithoutOccurence);

                if (expense.recurrence.occurrences) expense.recurrence.occurrences -= 1;
                if (expense.recurrence.occurrences === 0) expense.recurrence.isCancelled = true

                await newExpense.save({ session });
                await expense.save({ session });
            } else if (beforEndDate == false || occurencesleft == false) {
                expense.recurrence.isCancelled = true;
                await expense.save({ session });
            }

            await session.commitTransaction()

        } catch (error) {
            // Abort the transaction on error
            await session.abortTransaction();
            console.error(error);
            res.status(500).json({ error: 'Failed to create expense' });
        } finally {
            // End the session in any case (success or failure)
            session.endSession();
        }

    }
}

// plan to execute generateRecurrencesExpenses every day a 00:00
cron.schedule('0 0 * * *', () => {
    console.log('reccurent expense check ' + new Date());
    generateRecurrencesExpenses();
});

export {
    getProfitByweekOnMonth,
    getExpenseCurrentMonthCompareLastMonth,
    getExpenseYearStatistics,
    getAllExpenses,
    getExpenseByID,
    creatExpenses,
    updatedExpenses,
}
