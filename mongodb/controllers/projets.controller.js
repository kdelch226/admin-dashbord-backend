import mongoose from 'mongoose';
import Projet from '../models/projet.js'
import Audit from '../models/audit.js'
import User from '../models/user.js';
import Client from '../models/client.js';
import Employe from '../models/employe.js';


// cloudinary.config({
//     cloud_name: process.env.CLOUNDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUNDINARY_CLOUD_KEY,
//     api_secret: process.env.CLOUNDINARY_CLOUD_SECRET
// });

const getAllProjets = async (req, res) => {
    try {
        const { _end, _order, _start, _sort, title_like = '', client = ''
        } = req.query;

        let query = {}
        if (title_like) {
            query.title = { $regex: title_like, $options: 'i' }
        }

        if (client) {
            query.client = { $regex: client, $options: 'i' }
        }

        const sort = {};
        if (_sort && _order) {
            sort[_sort] = _order === 'desc' ? -1 : 1;
        } else {
            sort._id = 1;
        }

        const count = await Projet.countDocuments({ query })
        const Projets = await Projet
            .find(query)
            .limit(_end)
            .skip(_start)
            .sort(sort);

        res.header('x-total-count', count)
        res.header('Acces-Control-Expose-Headers', 'x-total-count')

        res.status(200).json(Projets)
    }
    catch (error) {
        console.log(error)
        res.status(500).json({ error })
    }
}

const getProjetByID = async (req, res) => {
    const { id } = req.params;
    await Projet.findOne({ _id: id })
        // .populate('tasks')
        // .populate('assignedEmployees')
        .populate('client')
        .populate('assignedEmployees')
        // .populate('payment')
        // .populate('expense')
        .then((Projet) => {
            if (!Projet) res.status(201).json({ message: 'Projet not found' })
            else {
                res.status(200).json(Projet)
            }
        })
        .catch((error) => {
            console.log(error)
            res.status(500).json({ error })
        });
}

const creatProjets = async (req, res) => {
    const { title, description, startDate, initialBudget, estimatedEndDate } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    const email = req.header['X-Email-Creator'];

    try {
        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        if (startDate > estimatedEndDate) throw new Error(' startDateis earlier than estimatedEndDate')

        const dateCreation = new Date();
        const newProjet = new Projet({
            title,
            description,
            startDate,
            initialBudget,
            estimatedEndDate,
        });

        await newProjet.save({ session });

        const auditLog = new Audit({
            action: 'create',
            documentId: newProjet._id,
            documentType: 'Projet',
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
        res.status(201).json({ message: 'Projet created with successfully' });
    }
    catch (error) {
        res.status(500).json({ error })
    }
}



const updatedProjets = async (req, res) => {

    const { id } = req.params;
    const email = req.get('X-Email-Creator');

    const session = await mongoose.startSession();
    session.startTransaction();
    console.log(req.body)

    try {

        const { clientId, employeId, ...projetData } = req.body;
        const updatedData = req.body;


        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        const updatedProjet = await Projet.findByIdAndUpdate(
            id,
            { $set: projetData },
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
            await Projet.findByIdAndUpdate(
                id,
                { $set: { client: clientId } },
                { new: true, session }
            );

            // Add the project to the client's projects list
            await Client.findByIdAndUpdate(
                clientId,
                { $addToSet: { projet: id } },
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
            await Projet.findByIdAndUpdate(
                id,
                { $addToSet: { assignedEmployees: employeId } },
                { new: true, session }
            );

            // Add the project to the employe's projects 
            list
            await Employe.findByIdAndUpdate(
                employeId,
                { $addToSet: { projet: id } },
                { new: true, session }
            );


        }


        if (!updatedProjet) {
            await session.abortTransaction();  // Abort if project is not found
            return res.status(404).json({ message: 'Projet not found' });
        }
        const auditLog = new Audit({
            action: 'update',
            documentId: id,
            documentType: 'Projet',
            changedBy: email,
            changes: updatedData,
            timestamp: new Date(),
        });
        await auditLog.save({ session });
        await session.commitTransaction();
        res.status(200).json({ message: 'Projet updated successfully' });

    }
    catch (error) {
        console.log(error)
        await session.abortTransaction(); // Abort the transaction on error
        res.status(500).json({ error })
    } finally {
        session.endSession(); // End the session
    }
}

const removeClientFromProjet = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { projectId, clientId } = req.params;

        // Retirer le client du projet
        const updatedProject = await Projet.findByIdAndUpdate(
            projectId,
            { $unset: { client: "" } },
            { new: true, session }
        );

        if (!updatedProject) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Project not found' });
        }

        // Retirer le projet de la liste des projets du client
        await Client.findByIdAndUpdate(
            clientId,
            { $pull: { projet: projectId } },
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
const deleteProjet = async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body

        const session = await mongoose.startSession();
        session.startTransaction();

        const projetToDelete = await Projet.findOne({ _id: id }).session(session);
        if (!projetToDelete) {
            throw new Error('Projet not found');
        }
        const auditLog = new Audit({
            action: 'delete',
            documentId: id,
            documentType: 'Projet',
            changedBy: email,
            changes: projetToDelete,
            timestamp: new Date(),
        });

        await auditLog.save({ session });
        await Projet.deleteOne({ _id: id }).session(session);
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }

}

export {
    getAllProjets,
    getProjetByID,
    creatProjets,
    updatedProjets,
    deleteProjet,
    removeClientFromProjet
}
