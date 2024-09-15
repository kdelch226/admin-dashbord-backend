import mongoose from 'mongoose';
import Client from '../models/client.js'


// cloudinary.config({
//     cloud_name: process.env.CLOUNDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUNDINARY_CLOUD_KEY,
//     api_secret: process.env.CLOUNDINARY_CLOUD_SECRET
// });

const getAllClients = async (req, res) => {
    try {
        const { _end, _order, _start, _sort, name_like = '', company_like = '', projet = '', event = ''
        } = req.query;

        let query = {}
        if (name_like) {
            query.name = { $regex: name_like, $options: 'i' }
        }

        if (company_like) {
            query.company = { $regex: company_like, $options: 'i' }
        }

        if (projet) {
            query.projet = { $regex: projet, $options: 'i' }
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
            if (!client) res.status(201).json({ message: 'Client not found' })
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
    const dateCreation = new Date();
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        await Client.create({
            name,
            address,
            phoneNumber,
            email,
            gender,
            company,
            dateCreation,
            industry
        }, { session });

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
        res.status(201).json({ message: 'Client created with successfully' });
    }
    catch (error) {
        res.status(500).json({ error })
    }
}

const updatedClients = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        const updatedClient = await Client.findByIdAndUpdate(
            id,
            { $set: updatedData },
            { new: true, runValidators: true }
        );

        if (!updatedClient) res.status(404).json({ message: 'Client not found' });
        res.status(200).json({ message: 'Client updated successfully' });

    }
    catch (error) {
        res.status(500).json({ error })
    }
}

export {
    getAllClients,
    getClientByID,
    creatClients,
    updatedClients,
}
