import mongoose from 'mongoose';
import Task from '../models/task.js'
import Audit from '../models/audit.js'
import User from '../models/user.js';
import Client from '../models/client.js';
import Employe from '../models/employe.js';


// cloudinary.config({
//     cloud_name: process.env.CLOUNDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUNDINARY_CLOUD_KEY,
//     api_secret: process.env.CLOUNDINARY_CLOUD_SECRET
// });

const getAllTasks = async (req, res) => {
    try {
        const { _end, _order, _start, _sort, title_like = '', status = '', importance = ''
        } = req.query;

        let query = {}
        if (title_like) {
            query.title = { $regex: title_like, $options: 'i' }
        };

        if (status) {
            query.status = { $regex: status, $options: 'i' }
        };

        if (importance) {
            query.importance = { $regex: importance, $options: 'i' }
        };

        const sort = {};
        if (_sort && _order) {
            sort[_sort] = _order === 'desc' ? -1 : 1;
        } else {
            sort._id = 1;
        }

        const count = await Task.countDocuments({ query })
        const Tasks = await Task
            .find(query)
            .limit(_end)
            .skip(_start)
            .sort(sort);

        res.header('x-total-count', count)
        res.header('Acces-Control-Expose-Headers', 'x-total-count')

        res.status(200).json(Tasks)
    }
    catch (error) {
        res.status(500).json({ error })
    }
}

const getTaskByID = async (req, res) => {
    const { id } = req.params;
    await Task.findOne({ _id: id })
        .populate('relatedProject')
        .populate('assignedEmployees')
        .then((Task) => {
            if (!Task) res.status(201).json({ message: 'Task not found' })
            else {
                res.status(200).json(Task)
            }
        })
        .catch((error) => {
            console.log(error)
            res.status(500).json({ error })
        });
}

const creatTasks = async (req, res) => {
    const { title, description, importance, status, dueDate } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    const email = req.header['X-Email-Creator'];

    try {
        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        if (startDate > estimatedEndDate) throw new Error(' startDateis earlier than estimatedEndDate')

        const dateCreation = new Date();
        const newTask = new Task({
            title,
            description,
            startDate,
            initialBudget,
            estimatedEndDate,
        });

        await newTask.save({ session });

        const auditLog = new Audit({
            action: 'create',
            documentId: newTask._id,
            documentType: 'Task',
            changedBy: email,
            changes: {
                title,
                description,
                startDate,
                initialBudget,
                estimatedEndDate,
            },
            timestamp: new Date(),
        });
        await auditLog.save({ session });

        await session.commitTransaction();
        res.status(201).json({ message: 'Task created with successfully' });
    }
    catch (error) {
        res.status(500).json({ error })
    }
}



const updatedTasks = async (req, res) => {

    const { id } = req.params;
    const email = req.get('X-Email-Creator');

    const session = await mongoose.startSession();
    session.startTransaction();
    console.log(req.body)

    try {

        const { clientId, employeId, ...TaskData } = req.body;
        const updatedData = req.body;


        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        const updatedTask = await Task.findByIdAndUpdate(
            id,
            { $set: TaskData },
            { new: true, session }
        );

        if (clientId) {
            // Check if client exists
            const clientExists = await Client.exists({ _id: clientId }).session(session);
            if (!clientExists) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: 'Client not found' });
            }

            // Update project with clientId
            await Task.findByIdAndUpdate(
                id,
                { $set: { client: clientId } },
                { new: true, session }
            );

            // Add the project to the client's projects list
            await Client.findByIdAndUpdate(
                clientId,
                { $addToSet: { Task: id } },
                { new: true, session }
            );
        }

        if (employeId) {
            // Check if employe exists
            const employeExists = await Employe.exists({ _id: employeId }).session(session);
            if (!employeExists) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: 'employe not found' });
            }

            // Update project with employeId
            await Task.findByIdAndUpdate(
                id,
                { $addToSet: { assignedEmployees: employeId } },
                { new: true, session }
            );

            // Add the project to the employe's projects 
            list
            await Employe.findByIdAndUpdate(
                employeId,
                { $addToSet: { Task: id } },
                { new: true, session }
            );


        }


        if (!updatedTask) {
            await session.abortTransaction();  // Abort if project is not found
            return res.status(404).json({ message: 'Task not found' });
        }
        const auditLog = new Audit({
            action: 'update',
            documentId: id,
            documentType: 'Task',
            changedBy: email,
            changes: updatedData,
            timestamp: new Date(),
        });
        await auditLog.save({ session });
        await session.commitTransaction();
        res.status(200).json({ message: 'Task updated successfully' });

    }
    catch (error) {
        console.log(error)
        await session.abortTransaction(); // Abort the transaction on error
        res.status(500).json({ error })
    } finally {
        session.endSession(); // End the session
    }
}

const removeClientFromTask = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { projectId, clientId } = req.params;

        // Retirer le client du Task
        const updatedProject = await Task.findByIdAndUpdate(
            projectId,
            { $unset: { client: "" } },
            { new: true, session }
        );

        if (!updatedProject) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Project not found' });
        }

        // Retirer le Task de la liste des Tasks du client
        await Client.findByIdAndUpdate(
            clientId,
            { $pull: { Task: projectId } },
            { new: true, session }
        );

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Client removed from project successfully' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: 'An error occurred while removing the client from the project' });
    }
};
const deleteTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body

        const session = await mongoose.startSession();
        session.startTransaction();

        const TaskToDelete = await Task.findOne({ _id: id }).session(session);
        if (!TaskToDelete) {
            throw new Error('Task not found');
        }
        const auditLog = new Audit({
            action: 'delete',
            documentId: id,
            documentType: 'Task',
            changedBy: email,
            changes: TaskToDelete,
            timestamp: new Date(),
        });

        await auditLog.save({ session });
        await Task.deleteOne({ _id: id }).session(session);
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }

}

export {
    getAllTasks,
    getTaskByID,
    creatTasks,
    updatedTasks,
    deleteTask,
    removeClientFromTask
}
