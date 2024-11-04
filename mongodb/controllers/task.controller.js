import mongoose from 'mongoose';
import Task from '../models/task.js';
import Audit from '../models/audit.js';
import User from '../models/user.js';
import Client from '../models/client.js';
import Employe from '../models/employe.js';
import Project from '../models/project.js';

const getAllTasks = async (req, res) => {
    try {
        const { _end, _order, _start, _sort, title_like = '', status = '', importance = '' } = req.query;

        let query = {};
        if (title_like) {
            query.title = { $regex: title_like, $options: 'i' };
        }
        if (status) {
            query.status = { $regex: status, $options: 'i' };
        }
        if (importance) {
            query.importance = { $regex: importance, $options: 'i' };
        }

        const sort = {};
        if (_sort && _order) {
            sort[_sort] = _order === 'desc' ? -1 : 1;
        } else {
            sort._id = 1;
        }

        const count = await Task.countDocuments(query);
        const tasks = await Task
            .find(query)
            .limit(Number(_end))
            .skip(Number(_start))
            .sort(sort);

        res.header('x-total-count', count);
        res.header('Acces-Control-Expose-Headers', 'x-total-count');
        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getTaskByID = async (req, res) => {
    const { id } = req.params;
    try {
        const task = await Task.findById(id)
            .populate('relatedProject')
            .populate('assignedEmployees');

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.status(200).json(task);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createTasks = async (req, res) => {
    const { title, description, importance, status, dueDate, projectId } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    const email = req.get('X-Email-Creator');

    try {
        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        const dateCreation = new Date();
        const newTask = new Task({
            title,
            description,
            importance,
            status,
            dueDate,
            dateCreation
        });

        const task = await newTask.save({ session });

        if (projectId) {
            const project = Project.findById(projectId);
            if (!project) return res.status(404).json({ message: 'Project not found' });

            Project.findByIdAndUpdate(
                projectId,
                { $addToSet: { tasks: task._id } },
                { new: true, session }
            )

            task.projects = task.projects || []; // Assurez-vous que le tableau existe
            task.projects.push(projectId); // Ajoute l'ID du projet à la liste des projets de la tâche

            // Sauvegarde la tâche mise à jour
            await task.save({ session });

        }

        const auditLog = new Audit({
            action: 'create',
            documentId: newTask._id,
            documentType: 'Task',
            changedBy: email,
            changes: {
                title,
                description,
                importance,
                status,
                dueDate,
                dateCreation
            },
            timestamp: new Date(),
        });
        await auditLog.save({ session });

        await session.commitTransaction();
        session.endSession();
        res.status(201).json({ message: 'Task created successfully' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: error.message });
    }
};

const updatedTasks = async (req, res) => {
    const { id } = req.params;
    const email = req.get('X-Email-Creator');
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { clientId, employesIds, projectId, ...taskData } = req.body;

        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        const updatedTask = await Task.findByIdAndUpdate(
            id,
            { $set: taskData },
            { new: true, session }
        );

        if (!updatedTask) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Task not found' });
        }

        if (clientId) {
            const clientExists = await Client.exists({ _id: clientId }).session(session);
            if (!clientExists) {
                await session.abortTransaction();
                return res.status(404).json({ message: 'Client not found' });
            }

            await Task.findByIdAndUpdate(
                id,
                { $set: { client: clientId } },
                { new: true, session }
            );

            await Client.findByIdAndUpdate(
                clientId,
                { $addToSet: { task: id } },
                { new: true, session }
            );
        }

        if (employesIds) {
            // Use for...of to properly handle async/await
            for (const employeId of employesIds) {
                const employeExists = await Employe.exists({ _id: employeId }).session(session);
                if (!employeExists) {
                    await session.abortTransaction();
                    return res.status(404).json({ message: 'Employee not found' });
                }

                await Task.findByIdAndUpdate(
                    id,
                    { $addToSet: { assignedEmployees: employeId } },
                    { new: true, session }
                );

                await Employe.findByIdAndUpdate(
                    employeId,
                    { $addToSet: { task: id } },
                    { new: true, session }
                );
            }
        }

        if (projectId) {
            const projectExists = await Project.exists({ _id: projectId }).session(session);
            if (!projectExists) {
                await session.abortTransaction();
                return res.status(404).json({ message: 'Project not found' });
            }

            await Task.findByIdAndUpdate(
                id,
                { $set: { relatedProject: projectId } },
                { new: true, session }
            );

            await Project.findByIdAndUpdate(
                projectId,
                { $addToSet: { tasks: id } },
                { new: true, session }
            );
        }

        const auditLog = new Audit({
            action: 'update',
            documentId: id,
            documentType: 'Task',
            changedBy: email,
            changes: taskData,
            timestamp: new Date(),
        });
        await auditLog.save({ session });

        await session.commitTransaction();
        return res.status(200).json({ message: 'Task updated successfully' });
    } catch (error) {
        await session.abortTransaction();
        return res.status(500).json({ error: error.message });
    } finally {
        session.endSession(); // Ensure the session is ended once transaction is complete
    }
};




const deleteTask = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const { id } = req.params;
    const email = req.get('X-Email-Creator');
    try {
        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        const taskToDelete = await Task.findById(id).session(session);
        if (!taskToDelete) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Task not found' });
        }

        await taskToDelete.softDelete();
        const auditLog = new Audit({
            action: 'delete',
            documentId: id,
            documentType: 'Task',
            changedBy: email,
            changes: {
                title: taskToDelete.title
            },
            timestamp: new Date(),
        });
        auditLog.save({ session })
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.log(error)
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: error.message });
    }
};

const removeprojectFromTask = async (req, res) => {
    const email = req.get('X-Email-Creator');
    const session = await mongoose.startSession();
    const { taskId, id } = req.params;

    try {
        session.startTransaction(); // Déplacer cela au début pour garantir que toutes les opérations sont dans une transaction

        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        // Retirer le project de la tâche
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { $pull: { project: id } },
            { new: true, session } // Transaction utilisée ici
        );

        if (!updatedTask) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Task not found' });
        }

        // Retirer la tâche de la liste des tâches du project
        const updatedproject = await project.findByIdAndUpdate(
            id,
            { $pull: { tasks: taskId } },
            { new: true, session } // Transaction utilisée ici
        );

        if (!updatedproject) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'project not found' });
        }

        // Enregistrer l'audit dans la transaction
        const newAudit = new Audit({
            action: 'update',
            documentId: id,
            documentType: 'project',
            changedBy: email,
            changes: { updatedproject, updatedTask },
            timestamp: new Date(),
        });

        // Attendre que l'audit soit sauvegardé
        await newAudit.save({ session });

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Task removed from project successfully' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error occurred during task removal: ', error);
        res.status(500).json({ error: 'An error occurred while removing the task from the project' });
    }
};

const removeEmployeFromTask = async (req, res) => {
    const session = await mongoose.startSession();
    const email = req.get('X-Email-Creator');
    const { taskId, id } = req.params;

    try {
        session.startTransaction(); // Commence la transaction dès le début

        // Rechercher l'utilisateur par email
        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        // Retirer l'employé de la tâche
        const updatedTask = await Task.findByIdAndUpdate(
            taskId,
            { $pull: { assignedEmployees: id } },
            { new: true, session }
        );

        if (!updatedTask) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Task not found' });
        }

        // Retirer la tâche de la liste des projects de l'employé
        const updatedEmployee = await Employe.findByIdAndUpdate(
            id,
            { $pull: { task: taskId } },
            { new: true, session }
        );

        if (!updatedEmployee) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Enregistrer un audit de cette action (facultatif)
        const newAudit = new Audit({
            action: 'update',
            documentId: id,
            documentType: 'employee',
            changedBy: email,
            changes: { updatedTask, updatedEmployee },
            timestamp: new Date(),
        });

        await newAudit.save({ session }); // Enregistrer l'audit dans la même transaction

        // Commit the transaction
        await session.commitTransaction();
        res.status(200).json({ message: 'Employee removed from task successfully' });
    } catch (error) {
        await session.abortTransaction(); // Annule la transaction si une erreur survient
        res.status(500).json({ error: 'An error occurred while removing the employee from the task' });
    } finally {
        session.endSession(); // S'assure que la session est toujours fermée
    }
};

const getTaskStatistics = async (req, res) => {
    try {
        // Récupérer le nombre total de projets
        const totalTasks = await Task.countDocuments({});

        // Récupérer le nombre de projets terminés
        const cancelledTasks = await Task.countDocuments({ status: 'cancelled' });
        const completedTasks = await Task.countDocuments({ status: 'completed' });


        // Calculer le nombre de projets non terminés
        const nonCompletedTasks = totalTasks - completedTasks - cancelledTasks;

        // Calculer les pourcentages
        const completedPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const cancelledPercentage = totalTasks > 0 ? (cancelledTasks / totalTasks) * 100 : 0;
        const nonCompletedPercentage = totalTasks > 0 ? (nonCompletedTasks / totalTasks) * 100 : 0;

        // Envoyer les statistiques au client
        res.status(200).json({
            totalTasks,
            cancelledPercentage: cancelledPercentage.toFixed(2),
            completedPercentage: completedPercentage.toFixed(2),
            nonCompletedPercentage: nonCompletedPercentage.toFixed(2)
        });

    } catch (error) {
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
};

export {
    getAllTasks,
    getTaskByID,
    createTasks,
    updatedTasks,
    removeEmployeFromTask,
    removeprojectFromTask,
    deleteTask,
    getTaskStatistics
};
