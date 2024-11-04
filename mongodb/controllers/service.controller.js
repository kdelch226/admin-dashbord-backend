import Service from "../models/service.js";
import Project from "../models/project.js";
import Payment from "../models/payment.js";
import mongoose from 'mongoose';
import User from '../models/user.js';
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import Audit from "../models/audit.js";

cloudinary.config({
    cloud_name: process.env.CLOUNDINARY_CLOUD_NAME,
    api_key: process.env.CLOUNDINARY_CLOUD_KEY,
    api_secret: process.env.CLOUNDINARY_CLOUD_SECRET
});

const getAllServices = async (req, res) => {

    try {
        const { _end, _order, _start, _sort, title_like = '', expertise = ''
        } = req.query;

        let query = {};
        if (expertise !== '') {
            query.expertise = expertise
        }

        if (title_like) {
            query.title = { $regex: title_like, $options: 'i' }
        }

        const sort = {};
        if (_sort && _order) {
            sort[_sort] = _order === 'desc' ? -1 : 1;
        } else {
            sort._id = 1;
        }

        const count = await Service.countDocuments({ query })
        const services = await Service
            .find(query)
            .limit(_end)
            .skip(_start)
            .sort(sort);

        res.header('x-total-count', count)
        res.header('Acces-Control-Expose-Headers', 'x-total-count')

        res.status(200).json(services)
    }
    catch (error) {
        res.status(400).json({ error })

    }
};

const createService = async (req, res) => {
    const { title, expertise, description, photo, email } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        const photoUrl = await cloudinary.uploader.upload(photo);

        const newService = await Service.create([{
            title,
            expertise,
            description,
            photo: photoUrl.url,
            creator: user._id,
        }], { session });

        user.allService.push(newService[0]._id);
        await user.save({ session });

        // Create audit log
        const audit = new Audit({
            action: 'create',
            documentId: newService[0]._id,
            documentType: 'Service',
            changedBy: email,
            changes: { message: `Service ${title} was created` }
        });

        await audit.save({ session });

        await session.commitTransaction();
        res.status(200).json({ message: 'Service created successfully' });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: error.message });
    } finally {
        session.endSession();
    }
};


const getServiceById = async (req, res) => {
    const { id } = req.params;
    await Service.findOne({ _id: id }).populate('creator')
        .then(service => {
            if (service) {
                res.status(200).json(service)
            }
            else {
                res.status(404).json({ message: 'no service found' })
            }
        })
        .catch(error => res.status(500).json({ error }));



};

const updateService = async (req, res) => {
    const { id } = req.params;
    const { title, expertise, description, photo, email } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const serviceToUpdate = await Service.findOne({ _id: id }).session(session);
        if (!serviceToUpdate) {
            throw new Error('Service not found');
        }

        const updateFields = {};
        if (photo) {
            const photoUrl = await cloudinary.uploader.upload(photo);
            updateFields.photo = photoUrl.url;
        };

        if (title != serviceToUpdate.title) {
            updateFields.title = title;
        };

        if (expertise != serviceToUpdate.expertise) {
            updateFields.expertise = expertise;
        };

        if (description != serviceToUpdate.description) {
            updateFields.description = description;
        };

        const updatedService = await Service.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, session }
        );

        if ( Object.keys(updateFields).length === 0 ) {updateFields.info='update with no change'};
        // Create audit log
        const audit = new Audit({
            action: 'update',
            documentId: updatedService._id,
            documentType: 'Service',
            changedBy: email,
            changes: {
                message: `Service ${title} was updated`,
                changes: updateFields,
            }
        });

        await audit.save({ session });

        await session.commitTransaction();
        res.status(200).json({ message: 'Service updated successfully' });
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: error.message });
    } finally {
        session.endSession();
    }
};



const deleteService = async (req, res) => {
    const { id } = req.params;
    const { email } = req.body; // Assuming the user's email is passed in the request body

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const serviceToDelete = await Service.findOne({ _id: id }).populate('creator').session(session);
        if (!serviceToDelete) {
            throw new Error('Service not found');
        }

        // Remove service from creator's allService array
        await serviceToDelete.creator.allService.pull(serviceToDelete._id);
        await serviceToDelete.creator.save({ session });

        // Delete the service
        await Service.softDelete();

        // Create audit log
        const audit = new Audit({
            action: 'delete',
            documentId: id,
            documentType: 'Service',
            changedBy: email,
            changes: { message: `Service with ID ${id} was deleted`, title: serviceToDelete.title }
        });

        await audit.save({ session });

        await session.commitTransaction();
        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};


export const getProjectsCountByService = async (req, res) => {
    try {
        const results = await Project.aggregate([
            {
                $group: {
                    _id: '$service',
                    totalProjects: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: 'services',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'serviceDetails'
                }
            },
            {
                $unwind: '$serviceDetails'
            },
            {
                $project: {
                    serviceName: '$serviceDetails.title',
                    totalProjects: 1
                }
            }
        ]);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des projects par service', error });
    }
};

// Controller pour obtenir les revenus par service
// Controller pour obtenir les revenus par service
export const getRevenueByService = async (req, res) => {
    try {
        const results = await Payment.aggregate([
            {
                $lookup: {
                    from: 'projects',
                    localField: 'project',
                    foreignField: '_id',
                    as: 'projectDetails'
                }
            },
            {
                $unwind: '$projectDetails'
            },
            {
                $group: {
                    _id: '$projectDetails.service',
                    totalRevenue: { $sum: '$amount' }
                }
            },
            {
                $lookup: {
                    from: 'services',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'serviceDetails'
                }
            },
            {
                $unwind: '$serviceDetails'
            },
            // Filter out deleted services
            {
                $match: {
                    'serviceDetails.deleted': false
                }
            },
            {
                $project: {
                    serviceName: '$serviceDetails.title',
                    totalRevenue: 1
                }
            }
        ]);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des revenus par service', error });
    }
};


export {
    getAllServices,
    createService,
    getServiceById,
    updateService,
    deleteService,
}