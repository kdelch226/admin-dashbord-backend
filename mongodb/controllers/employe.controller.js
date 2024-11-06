import mongoose from 'mongoose';
import Employe from '../models/employe.js';
import Audit from '../models/audit.js'
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import project from '../models/project.js';

// cloudinary.config({
//     cloud_name: process.env.CLOUNDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUNDINARY_CLOUD_KEY,
//     api_secret: process.env.CLOUNDINARY_CLOUD_SECRET
// });

const getAllEmployes = async (req, res) => {

    try {
        const { _end, _order, _start, _sort, name_like = '', etat = '', post_like = '', projects_ne = '', tasks_ne = ''
        } = req.query;

        let query = {}
        if (name_like) {
            query.name = { $regex: name_like, $options: 'i' }
        }

        if (etat) {
            query.etat = { $regex: etat, $options: 'i' }
        }

        if (post_like) {
            query.post = { $regex: post_like, $options: 'i' }
        }
        if (tasks_ne) {
            query.task = { $ne: tasks_ne }
        };

        if (projects_ne) {
            query.project = { $ne: projects_ne }
        }

        const sort = {};
        if (_sort && _order) {
            sort[_sort] = _order === 'desc' ? -1 : 1;
        } else {
            sort._id = 1;
        }


        const count = await Employe.countDocuments({ query })
        const employes = await Employe
            .find(query)
            .limit(_end)
            .skip(_start)
            .sort(sort);

        res.header('x-total-count', count)
        res.header('Acces-Control-Expose-Headers', 'x-total-count')

        res.status(200).json(employes)
    }
    catch (error) {
        res.status(500).json({ error })
    }
}

const getEmployeByID = async (req, res) => {
    const { id } = req.params;
    await Employe.findOne({ _id: id })
        .then((employe) => {
            if (!employe) res.status(404).json({ message: 'employe not found' })
            else {
                res.status(200).json(employe)
            }
        })
        .catch((error) => {
            res.status(500).json({ error })
        });
}

const creatEmployes = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { name, address, gender, phoneNumber, email, post } = req.body;
        const etat = 'En formation';
        const dateEmbauche = new Date();

        // Create the employee within the session
        const newEmploye = await Employe.create(
            [{
                name,
                address,
                phoneNumber,
                email,
                dateEmbauche,
                post,
                gender,
                etat,
            }],
            { session }
        );

        // Create an audit log entry for the employee creation
        const auditLog = new Audit({
            action: 'create',
            documentId: newEmploye[0]._id,
            documentType: 'employe',
            changedBy: email,
            changes: {
                name,
                address,
                phoneNumber,
                email,
                dateEmbauche,
                post,
                gender,
                etat,
            },
            timestamp: new Date(),
        });

        await auditLog.save({ session });

        // Commit the transaction if both operations succeed
        await session.commitTransaction();
        res.status(201).json({ message: 'Employe created successfully' });

    } catch (error) {
        // Abort the transaction on error
        await session.abortTransaction();
        console.log(error)
        res.status(500).json({ error: 'Failed to create employe' });

    } finally {
        // End the session in any case (success or failure)
        session.endSession();
    }
};

const updatedEmployes = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const updatedData = req.body;

        const originalEmploye = await Employe.findById(id);
        if (!originalEmploye) res.status(404).json({ message: 'employe not found' });
        // Update the employee document within the session
        const updatedEmploye = await Employe.findByIdAndUpdate(
            id,
            { $set: updatedData },
            { new: true, runValidators: true, session }
        );

        if (!updatedEmploye) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Employe not found' });
        }

        const changes = {}

        Object.keys(updatedEmploye).forEach((key) => {
            if (!originalEmploye[key]) changes[key] = { add: updatedEmploye[key] }
            if (originalEmploye[key] != updatedEmploye[key]) {
                changes[key] = {
                    before: originalEmploye[key],
                    after: updatedEmploye[key]
                }
            }
        })
        // Create an audit log entry for the update
        const auditLog = new Audit({
            action: 'update',
            documentId: id,
            documentType: 'employe',
            changedBy: req.user?.email || 'unknown', // Assuming there's a logged-in user
            changes: changes,
            timestamp: new Date(),
        });

        await auditLog.save({ session });

        // Commit the transaction if both operations succeed
        await session.commitTransaction();
        res.status(200).json({ message: 'Employe updated successfully' });

    } catch (error) {
        // Abort the transaction on error
        await session.abortTransaction();
        console.error(error);
        res.status(500).json({ error: 'Failed to update employe' });

    } finally {
        // End the session in any case (success or failure)
        session.endSession();
    }
};

const employeStatistic = async (req, res) => {
    try {
        const totalEmploye = await Employe.countDocuments();
        const employeNoProject = await Employe.countDocuments({ $or: [{ project: { $exists: false } }, { project: { $size: 0 } }] });
        const employeWithProject = totalEmploye - employeNoProject;

        const employeNoProjectStatistic = totalEmploye > 0 ? (employeNoProject * 100) / totalEmploye : 0;
        const employeWithProjectStatistic = totalEmploye > 0 ? (employeWithProject * 100) / totalEmploye : 0;

        res.status(200).json({
            employeNoProject: employeNoProjectStatistic.toFixed(2),
            employeWithProject: employeWithProjectStatistic.toFixed(2),
            total: totalEmploye
        })
    } catch (error) {
        res.status(500).json({ error })
    }
}


export {
    getAllEmployes,
    getEmployeByID,
    creatEmployes,
    updatedEmployes,
    employeStatistic
}
