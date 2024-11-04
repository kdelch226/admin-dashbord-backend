import mongoose from 'mongoose';
import Client from '../models/client.js';
import Audit from '../models/audit.js'
import User from '../models/user.js';


// cloudinary.config({
//     cloud_name: process.env.CLOUNDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUNDINARY_CLOUD_KEY,
//     api_secret: process.env.CLOUNDINARY_CLOUD_SECRET
// });

const getAllClients = async (req, res) => {
    try {
        const { _end, _order, _start, _sort, name_like = '', company_like = '', project = '', event = ''
        } = req.query;

        let query = {}
        if (name_like) {
            query.name = { $regex: name_like, $options: 'i' }
        }

        if (company_like) {
            query.company = { $regex: company_like, $options: 'i' }
        }

        if (project) {
            query.project = { $regex: project, $options: 'i' }
        }

        if (event) {
            query.event = { $regex: event, $options: 'i' }
        }

        const sort = {};
        if (_sort && _order) {
            sort[_sort] = _order === 'desc' ? -1 : 1;
        } else {
            sort._id = 1;
        }

        const count = await Client.countDocuments({ query })
        const Clients = await Client
            .find(query)
            .limit(_end)
            .skip(_start)
            .sort(sort);

        res.header('x-total-count', count)
        res.header('Acces-Control-Expose-Headers', 'x-total-count')

        res.status(200).json(Clients)
    }
    catch (error) {
        res.status(500).json({ error })
    }
}

const getClientByID = async (req, res) => {
    const { id } = req.params;
    await Client.findOne({ _id: id })
        .then((client) => {
            if (!client) res.status(404).json({ message: 'Client not found' })
            else {
                res.status(200).json(client)
            }
        })
        .catch((error) => {
            res.status(500).json({ error })
        });
}

const creatClients = async (req, res) => {
    const { name, address, phoneNumber, email, gender, company, industry } = req.body;
    const userEmail = req.get('X-Email-Creator');


    const dateCreation = new Date();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {

        const user = await User.findOne({ email: userEmail }).session(session)
        if (!user) throw new Error('User not found');

        // Create client within the session
        const newClient = await Client.create([{
            name,
            address,
            phoneNumber,
            email,
            gender,
            company,
            dateCreation,
            industry
        }], { session });

        // Create audit log entry
        const auditLog = new Audit({
            action: 'create',
            documentId: newClient[0]._id,  // Use the created client’s ID
            documentType: 'client',        // Adjust the type to 'client'
            changedBy: user.email,
            changes: {
                name, address, phoneNumber, email, gender, company, industry
            },
            timestamp: new Date(),
        });

        // Save audit log within the same session
        await auditLog.save({ session });

        // Commit the transaction if all operations succeed
        await session.commitTransaction();
        res.status(201).json({ message: 'Client created successfully' });
    } catch (error) {
        // Abort the transaction on error
        await session.abortTransaction();
        res.status(500).json({ error: 'Failed to create client' });
    } finally {
        // End the session in any case (success or failure)
        session.endSession();
    }
};


const updatedClients = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const updatedData = req.body;

        const originalClient = await Client.findById(id);
        if (!originalClient) return res.status(404).json({ message: 'client not found' })

        // Update the client document within the session
        const updatedClient = await Client.findByIdAndUpdate(
            id,
            { $set: updatedData },
            { new: true, runValidators: true, session }
        );

        if (!updatedClient) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Client not found' });
        }

        const changes = {};
        Object.keys(updatedClient).forEach((key) => {
            if (!originalClient[key]) changes[key] = { add: updatedClient[key] }
            if (originalClient[key] !== updatedClient[key]) {
                changes[key] = {
                    before: originalClient[key],
                    after: updatedData[key]
                }
            }
        })


        // Create an audit log entry within the session
        const auditLog = new Audit({
            action: 'update',
            documentId: id,
            documentType: 'client',
            changedBy: req.user?.email || 'unknown', // Assuming you have a logged-in user
            changes: changes,
            timestamp: new Date(),
        });

        await auditLog.save({ session });

        // Commit the transaction if both operations succeed
        await session.commitTransaction();
        res.status(200).json({ message: 'Client updated successfully' });

    } catch (error) {
        // Abort the transaction on error
        await session.abortTransaction();
        res.status(500).json({ error: 'Failed to update client' });

    } finally {
        // End the session in any case (success or failure)
        session.endSession();
    }
};

const getClientStatistique = async (req, res) => {
    try {
        // Récupérer le nombre total de client
        const totalClients = await Client.countDocuments({});

        // Récupérer le nombre de client avec projets 
        const noClientsProject = await Client.countDocuments({ $or: [{ project: { $exists: false } }, { project: { $size: 0 } }] });
        // Calculer les pourcentages
        const noClientsProjectPercentage = totalClients > 0 ? (noClientsProject / totalClients) * 100 : 0;
        const clientsProjectPercentage = 100 - noClientsProjectPercentage;

        // Envoyer les statistiques au client
        res.status(200).json({
            totalClients,
            noClientsProjectPercentage: noClientsProjectPercentage.toFixed(2),
            clientsProjectPercentage: clientsProjectPercentage.toFixed(2),
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
}

export {
    getClientStatistique,
    getAllClients,
    getClientByID,
    creatClients,
    updatedClients,
}
