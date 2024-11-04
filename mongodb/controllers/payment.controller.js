import mongoose from 'mongoose';
import Payment from '../models/payment.js';
import Audit from '../models/audit.js'
import User from '../models/user.js';
import Task from '../models/task.js';
import Project from '../models/project.js';
import Event from '../models/event.js';
import cron from 'node-cron';
import updateAllRelevantObjectives from '../functions/updateAllRevelantObjectives.js';


const getAllPayments = async (req, res) => {
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

        const count = await Payment.countDocuments({ query })
        const Payments = await Payment
            .find(query)
            .limit(_end)
            .skip(_start)
            .sort(sort);

        res.header('x-total-count', count)
        res.header('Acces-Control-Expose-Headers', 'x-total-count')

        res.status(200).json(Payments)
    }
    catch (error) {
        res.status(500).json({ error })
    }
}

const getPaymentByID = async (req, res) => {
    const { id } = req.params;
    await Payment.findOne({ _id: id })
        .then((payment) => {
            if (!payment) res.status(404).json({ message: 'Payment not found' })
            else {
                res.status(200).json(payment)
            }
        })
        .catch((error) => {
            res.status(500).json({ error })
        });
}

const creatPayments = async (req, res) => {
    const { title, amount, date, description, transactionMethod, recurrence, category, projectId, eventId, taskId } = req.body;
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
            const projectExist = Project.findOne({ id: projectId });
            if (!projectExist) res.status(404).json({ message: 'project not found' })
            relatedObject = { project: projectId }
            relatedObjectAttribut = { projectTitle: projectExist.title, projectId: { projectId } }
        }
        if (eventId) {
            const eventExist = Event.findOne({ id: eventId });
            if (!eventExist) res.status(404).json({ message: 'event not found' })
            relatedObject = { event: eventId }
            relatedObjectAttribut = { eventTitle: eventExist.title, eventId: { eventId } }
        }
        if (taskId) {
            const taskExist = Task.findOne({ id: taskId });
            if (!taskExist) res.status(404).json({ message: 'task not found' })
            relatedObject = { task: taskId }
            relatedObjectAttribut = { taskTitle: taskExist.title, taskId: { taskId } }
        }

        // Create payment within the session
        const newPayment = new Payment({
            title,
            amount,
            date,
            description,
            transactionMethod,
            category,
            recurrence,
            ...relatedObject
        });

        await newPayment.save({ session })


        updateAllRelevantObjectives(date, 'payment')

        // Create audit log entry
        const auditLog = new Audit({
            action: 'create',
            documentId: newPayment._id,  // Use the created payment’s ID
            documentType: 'payment',        // Adjust the type to 'payment'
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
        res.status(201).json({ message: 'Payment created successfully' });
    } catch (error) {
        console.log(error)
        // Abort the transaction on error
        await session.abortTransaction();
        res.status(500).json({ error: 'Failed to create payment' });
    } finally {
        // End the session in any case (success or failure)
        session.endSession();
    }
};


const updatedPayments = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const updatedData = req.body;

        // Update the payment document within the session
        const updatedPayment = await Payment.findByIdAndUpdate(
            id,
            { $set: updatedData },
            { new: true, runValidators: true, session }
        );

        if (!updatedPayment) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Payment not found' });
        }

        // Create an audit log entry within the session
        const auditLog = new Audit({
            action: 'update',
            documentId: id,
            documentType: 'payment',
            changedBy: req.user?.email || 'unknown', // Assuming you have a logged-in user
            changes: updatedData,
            timestamp: new Date(),
        });

        await auditLog.save({ session });
        updateAllRelevantObjectives(updatedPayment.date, 'payment')


        // Commit the transaction if both operations succeed
        await session.commitTransaction();
        res.status(200).json({ message: 'Payment updated successfully' });

    } catch (error) {
        // Abort the transaction on error
        await session.abortTransaction();
        res.status(500).json({ error: 'Failed to update payment' });

    } finally {
        // End the session in any case (success or failure)
        session.endSession();
    }
};

const getPaymentYearStatistics = async (req, res) => {
    const currentYear = new Date().getFullYear();

    // Predefined months array initialized with zero
    const months = Array(12).fill(0); // [0,0,0,....]
    try {
        // Récupérer le nombre total de payment
        const monthlyPayments = await Payment.aggregate([
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

        monthlyPayments.forEach(payment => {
            const monthIndex = payment._id;
            months[monthIndex] = payment.total;
        })

        res.status(200).json(months)

    } catch (error) {
        console.log('payment monthly stat ', error)
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
}

const getPaymentCurrentMonthCompareLastMonth = async (req, res) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-11 for Jan-Dec
    const currentYear = currentDate.getFullYear();

    const firstDayCurrentMonth = new Date(currentYear, currentMonth, 1);
    const firstDayLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const firstDayNextMonth = new Date(currentYear, currentMonth + 1, 1);

    try {
        const payments = await Payment.aggregate([
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

        payments.forEach(payment => {
            const month = payment._id.month;
            if (month === currentMonth + 1) {
                currentMonthTotal = payment.total
            }
            else if (month === currentMonth) { // Previous month in 0-indexed format
                lastMonthTotal = payment.total; // Store total for the last month
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
        console.log('payment month compare last month ', error)
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
}

const generateRecurrencesPayments = async () => {
    const recurrencesPayment = await Payment.find({
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

    for (const payment of recurrencesPayment) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const frequency = payment.recurrence;
            let nextDate = new Date(payment.date);

            // definition of next date paiement depending of last paiement eand frequency
            if (frequency === 'daily') {
                nextDate.setDate(nextDate.getDate() + 1);
            } else if (frequency === 'weekly') {
                nextDate.setDate(nextDate.getDate() + 7);
            } else if (frequency === 'monthly') {
                nextDate.setMonth(nextDate.getMonth() + 1);
            }

            const isToday = nextDate === new Date();
            const beforEndDate = payment.recurrence.endDate ? nextDate <= payment.recurrence.endDate : true;
            const occurencesleft = payment.recurrence.occurrences ? payment.recurrence.occurrences > 0 : true;

            if (isToday && beforEndDate && occurencesleft) {
                const { recurrence, ...paymentWhithoutOccurence } = payment;

                const newPayment = new Payment(
                    date = nextDate,
                    ...paymentWhithoutOccurence);

                if (payment.recurrence.occurrences) payment.recurrence.occurrences -= 1;
                if (payment.recurrence.occurrences === 0) payment.recurrence.isCancelled = true

                await newPayment.save({ session });
                await payment.save({ session });
            } else if (beforEndDate == false || occurencesleft == false) {
                payment.recurrence.isCancelled = true;
                await payment.save({ session });
            }

            await session.commitTransaction()

        } catch (error) {
            // Abort the transaction on error
            await session.abortTransaction();
            console.error(error);
            res.status(500).json({ error: 'Failed to create payment' });
        } finally {
            // End the session in any case (success or failure)
            session.endSession();
        }

    }
}

// plan to execute generateRecurrencesPayments every day a 00:00
cron.schedule('0 0 * * *', () => {
    console.log('reccurent payment check ' + new Date());
    generateRecurrencesPayments();
});

export {
    getPaymentYearStatistics,
    getPaymentCurrentMonthCompareLastMonth,
    getAllPayments,
    getPaymentByID,
    creatPayments,
    updatedPayments,
}
