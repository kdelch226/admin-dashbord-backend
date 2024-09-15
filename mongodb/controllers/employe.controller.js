import mongoose from 'mongoose';
import Employe from '../models/employe.js'
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';

// cloudinary.config({
//     cloud_name: process.env.CLOUNDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUNDINARY_CLOUD_KEY,
//     api_secret: process.env.CLOUNDINARY_CLOUD_SECRET
// });

const getAllEmployes = async (req, res) => {
    console.log('getAllemploye',req.query)
    try {
        const { _end, _order, _start, _sort, name_like = '', etat = '',post_like = '',projet_ne=''
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

        if (projet_ne) {
            query.projet = { $ne: projet_ne }
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
        console.log(error)
        res.status(500).json({ error })
    }
}

const getEmployeByID = async (req, res) => {
    const { id } = req.params;
    await Employe.findOne({ _id: id })
        .then((employe) => {
            if (!employe) res.status(201).json({ message: 'employe not found' })
            else {
                res.status(200).json(employe)
            }
        })
        .catch((error) => {
            res.status(500).json({ error })
        });
}

const creatEmployes = async (req, res) => {
    try {
        const { name, address,gender, phoneNumber, email, post, } = req.body;
        const etat = 'En formation';
        const dateEmbauche= new Date();
        await Employe.create({
            name,
            address,
            phoneNumber,
            email,
            dateEmbauche,
            post,
            gender,
            etat,
        });
        res.status(201).json({ message: 'employe created with successfully' });
    }
    catch (error) {
        res.status(500).json({ error })
    }
}

const updatedEmployes = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedData = req.body;

        const updatedEmploye = await Employe.findByIdAndUpdate(
            id,
            { $set: updatedData },
            { new: true, runValidators: true }
        );

        if (!updatedEmploye) res.status(404).json({ message: 'employe not found' });
        res.status(200).json({ message: 'employe updated successfully' });

    }
    catch (error) {
        res.status(500).json({ error })
    }
}

export {
    getAllEmployes,
    getEmployeByID,
    creatEmployes,
    updatedEmployes,
}
