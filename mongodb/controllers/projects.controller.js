import mongoose from 'mongoose';
import Project from '../models/project.js'
import Audit from '../models/audit.js'
import User from '../models/user.js';
import Client from '../models/client.js';
import Employe from '../models/employe.js';


// cloudinary.config({
//     cloud_name: process.env.CLOUNDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUNDINARY_CLOUD_KEY,
//     api_secret: process.env.CLOUNDINARY_CLOUD_SECRET
// });

const getAllProjects = async (req, res) => {

    try {
        const { _end, _order, _start, _sort, title_like = '', client = ''
        } = req.query;

        let query = {};

        if (title_like) {
            query.title = { $regex: title_like, $options: 'i' }
        };

        if (client) {
            query.client = { $regex: client, $options: 'i' }
        };

        const sort = {};
        if (_sort && _order) {
            sort[_sort] = _order === 'desc' ? -1 : 1;
        } else {
            sort._id = 1;
        }

        const count = await Project.countDocuments({ query })
        const projects = await Project
            .find(query)
            .limit(_end)
            .skip(_start)
            .sort(sort);

        res.header('x-total-count', count)
        res.header('Acces-Control-Expose-Headers', 'x-total-count')
        res.status(200).json(projects)
    }
    catch (error) {
        res.status(500).json({ error })
    }
}

const getProjectByID = async (req, res) => {
    const { id } = req.params;
    await Project.findOne({ _id: id })
        .populate('tasks')
        // .populate('assignedEmployees')
        .populate('client')
        .populate('assignedEmployees')
        // .populate('payment')
        // .populate('expense')
        .then((Project) => {
            if (!Project) res.status(404).json({ message: 'Project not found' })
            else {
                res.status(200).json(Project)
            }
        })
        .catch((error) => {
            res.status(500).json({ error })
        });
}

const creatProjects = async (req, res) => {
    const { title, description, startDate, initialBudget, estimatedEndDate } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    const email = req.get('X-Email-Creator');

    try {
        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        if (startDate > estimatedEndDate) throw new Error(' startDateis earlier than estimatedEndDate')

        const dateCreation = new Date();
        const newProject = new Project({
            title,
            description,
            startDate,
            initialBudget,
            estimatedEndDate,
        });

        await newProject.save({ session });

        const auditLog = new Audit({
            action: 'create',
            documentId: newProject._id,
            documentType: 'Project',
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
        res.status(201).json({ message: 'Project created with successfully' });
    }
    catch (error) {
        res.status(500).json({ error })
    }
}



const updatedProjects = async (req, res) => {
    const { id } = req.params;
    const email = req.get('X-Email-Creator');
    const { clientId, employesIds, ...ProjectData } = req.body;
    const updatedData = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        

        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        const updatedProject = await Project.findByIdAndUpdate(
            id,
            { $set: ProjectData },
            { new: true, session }
        );

        let employeeChanges = []; // Pour stocker les changements des employés
        let clientChange = null; // Pour stocker les changements du client

        if (clientId) {
            const clientExists = await Client.exists({ _id: clientId }).session(session);
            if (!clientExists) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: 'Client not found' });
            }

            // Récupérer le nom du client
            const client = await Client.findById(clientId).session(session);
            clientChange = { name: client.name, id: clientId }; // Ajouter le nom et l'ID du client

            // Mettre à jour le projet avec clientId
            await Project.findByIdAndUpdate(
                id,
                { $set: { client: clientId } },
                { new: true, session }
            );

            // Ajouter le projet à la liste des projets du client
            await Client.findByIdAndUpdate(
                clientId,
                { $addToSet: { project: id } },
                { new: true, session }
            );
        }

        if (employesIds && employesIds.length > 0) {
            const employePromises = employesIds.map(async (employeId) => {
                const employeExists = await Employe.find({ _id: employeId }).session(session);
                console.log('employeExists ', employeExists, '\n');

                if (!employeExists) {
                    throw new Error(`Employee not found: ${employeId}`);
                }

                employeeChanges.push({ name: employeExists.name, id: employeId }); // Ajouter le nom et l'ID de l'employé

                // Mettre à jour le projet avec employeId
                await Project.findByIdAndUpdate(
                    id,
                    { $addToSet: { assignedEmployees: employeId } },
                    { new: true, session }
                );

                // Ajouter le projet à la liste des projets de l'employé
                await Employe.findByIdAndUpdate(
                    employeId,
                    { $addToSet: { project: id } },
                    { new: true, session }
                );
            });

            await Promise.all(employePromises);
        }

        if (!updatedProject) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Project not found' });
        }

        // Créer un audit log plus descriptif
        const changes = {
            ...updatedData,
            client: clientChange, // Ajouter le client au log
            addedEmployees: employeeChanges // Ajouter les employés au log
        };

        const auditLog = new Audit({
            action: 'update',
            documentId: id,
            documentType: 'Project',
            changedBy: email,
            changes,
            timestamp: new Date(),
        });
        await auditLog.save({ session });
        await session.commitTransaction();
        res.status(200).json({ message: 'Project updated successfully' });

    } catch (error) {
        console.log(error)
        await session.abortTransaction();
        res.status(500).json({ error });
    } finally {
        session.endSession();
    }
}


const removeClientFromProject = async (req, res) => {
    const email = req.get('X-Email-Creator');
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { ProjectId, id } = req.params;

        // Retirer le client du Project
        const updatedProject = await Project.findByIdAndUpdate(
            ProjectId,
            { $unset: { client: "" } },
            { new: true, session }
        );

        if (!updatedProject) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Project not found' });
        }

        // Retirer le Project de la liste des Projects du client
        await Client.findByIdAndUpdate(
            id,
            { $pull: { Project: ProjectId } },
            { new: true, session }
        );

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Client removed from Project successfully' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: 'An error occurred while removing the client from the Project' });
    }
};
const removeEmployeFromProject = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const email = req.get('X-Email-Creator');


    try {
        const { ProjectId, id } = req.params;

        // Remove the employee from the Project
        const updatedProject = await Project.findByIdAndUpdate(
            ProjectId,
            { $pull: { assignedEmployees: id } },
            { new: true, session }
        );

        if (!updatedProject) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Project not found' });
        }

        // Remove the Project from the employee's list of Projects
        const updatedEmployee = await Employe.findByIdAndUpdate(
            id,
            { $pull: { Project: ProjectId } },
            { new: true, session }
        );

        if (!updatedEmployee) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Commit the transaction
        await session.commitTransaction();
        res.status(200).json({ message: 'Employee removed from Project successfully' });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ error: 'An error occurred while removing the employee from the Project' });
    } finally {
        session.endSession(); // Ensure session ends in the finally block
    }
};


const deleteProject = async (req, res) => {
    const { id } = req.params;
    const email = req.get('X-Email-Creator');

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const ProjectToDelete = await Project.findOne({ _id: id }).populate('client').session(session);
        if (!ProjectToDelete) {
            throw new Error('Project not found');
        }
        const auditLog = new Audit({
            action: 'delete',
            documentId: id,
            documentType: 'Project',
            changedBy: email,
            changes: ProjectToDelete,
            timestamp: new Date(),
        });

        await ProjectToDelete.client.Project.pull(ProjectToDelete._id);
        await ProjectToDelete.softDelete();
        await auditLog.save({ session });
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }

}

const getProjectStatistics = async (req, res) => {
    try {
        // Récupérer le nombre total de projets
        const totalProjects = await Project.countDocuments({});

        // Récupérer le nombre de projets terminés
        const completedProjects = await Project.countDocuments({ status: 'Completed' });

        // Calculer le nombre de projets non terminés
        const nonCompletedProjects = totalProjects - completedProjects;

        // Calculer les pourcentages
        const completedPercentage = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;
        const nonCompletedPercentage = totalProjects > 0 ? (nonCompletedProjects / totalProjects) * 100 : 0;

        // Envoyer les statistiques au client
        res.status(200).json({
            totalProjects,
            completedPercentage: completedPercentage.toFixed(2),
            nonCompletedPercentage: nonCompletedPercentage.toFixed(2)
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
};

export {
    getAllProjects,
    getProjectByID,
    creatProjects,
    updatedProjects,
    deleteProject,
    removeClientFromProject,
    removeEmployeFromProject,
    getProjectStatistics
}
