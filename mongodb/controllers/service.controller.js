import Service from "../models/service.js";
import mongoose from 'mongoose';
import User from '../models/user.js';
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import service from "../models/service.js";

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
        const { title, expertise, description, photo, email } = req.body;
        const session = await mongoose.startSession();
        session.startTransaction();

        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        const photoUrl = await cloudinary.uploader.upload(photo);

        const newService = await Service.create({
            title,
            expertise,
            description,
            photo: photoUrl.url,
            creator: user._id,
        });

        user.allService.push(newService._id);
        await user.save({ session })
        await session.commitTransaction();
        res.status(200).json({ message: 'Service created successfully' })
    } catch (error) {
        res.status(500).json({ message: error.message })
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
    try {
        const { id } = req.params;
        const { title, expertise, description, photo } = req.body;

        // Trouver le service à mettre à jour
        const serviceToUpdate = await Service.findOne({ _id: id }).populate('creator');

        if (!serviceToUpdate) {
            throw new Error('Service not found');
        }

        // Créer un objet pour les champs à mettre à jour
        const updateFields = {
            title,
            expertise,
            description,
        };

        // Si une nouvelle photo est fournie, télécharger et mettre à jour
        if (photo) {
            const photoUrl = await cloudinary.uploader.upload(photo);
            updateFields.photo = photoUrl.url;
        }

        // Mettre à jour le service
        const updatedService = await Service.findByIdAndUpdate(
            id,
            { $set: updateFields },
        );

        res.status(200).json({ message: 'Service updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        const session = await mongoose.startSession();
        session.startTransaction();

        const serviceToDelete = await Service.findOne({ _id: id }).populate('creator').session(session);
        if (!serviceToDelete) {
            throw new Error('Service not found');
        }

        await serviceToDelete.creator.allService.pull(serviceToDelete._id);
        await serviceToDelete.creator.save({ session });
        await Service.deleteOne({ _id: id }).session(session);
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};



export {
    getAllServices,
    createService,
    getServiceById,
    updateService,
    deleteService,
}