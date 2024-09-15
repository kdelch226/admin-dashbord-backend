import User from "../models/user.js";
import AuditsLog from '../models/auditsLog.js'
import mongoose from 'mongoose'

const logAudit = async (req, userId, action) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const { country, city } = req.geo || { country: null, city: null };

    const email = req.get('X-Email-Creator');

    const session = await mongoose.startSession();
    session.startTransaction()
    try {
        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        const newAuditLog =await new AuditsLog({
            user: userId,
            action,
            userMail: email,
            ipAddress: ip,
            location: {
                country: country ? country.country_name : null,
                city: city ? city.city_name : null
            }
        });

        await newAuditLog.save({ session });
        session.commitTransaction();
    
    } catch (error) {
        console.error('Error logging audit:', error);
    }
};

const getAllUsers = async (req, res) => {
    try {
        const { _end, _order, _start, _sort, title_like = '',
        } = req.query;

        const query = {};

        if (title_like) {
            query.name = { $regex: title_like, $options: 'i' }
        }

        const sort = {};
        if (_sort && _order) {
            sort[_sort] = _order === 'desc' ? -1 : 1;
        } else {
            sort._id = 1;
        }

        const count = await User.countDocuments({ query })
        const users = await User
            .find(query)
            .limit(_end)
            .skip(_start)
            .sort(sort);

        res.header('x-total-count', count)
        res.header('Acces-Control-Expose-Headers', 'x-total-count')

        res.status(200).json(users)
    }
    catch (error) {
        res.status(500).json({ error })

    }
};

const getUserById = async (req, res) => {
    const { id } = req.params;
    await User.findOne({ _id: id }).populate('allService')
        .then(user => {
            if (user) {
                res.status(200).json(user);
            }
            else res.status(404).json({ message: 'user not found' });
        })
        .catch(error => res.status(400).json({ error }))
};

const handleLogin = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { name, email, avatar } = req.body;

        const userExists = await User.findOne({ email }).session(session);
        let userObjet = {};

        if (userExists) userObjet = userExists;
        else {
            const newUser = await User({
                name,
                email,
                avatar,
            }).session(session);
            userObjet = newUser;
        }

        await logAudit(req, userObjet._id, 'login');
        session.commitTransaction()
        res.status(200).json(userObjet);
    } catch (error) {
        console.log(error)
        res.status(400).json({ message: error.message });
    }
};

export const handleLogout = async (req, res) => {
    // Logique de déconnexion utilisateur ici...
    const userExists = await User.findOne({ email }).session(session);

    await logAudit(req, userExists._id, 'logout');

    res.send('Logout successful');
};

const updatedUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { number, adress } = req.body;

        const updateFields = {
            number,
            adress
        }

        await User.findByIdAndUpdate(
            id,
            { $set: updateFields }
        ).then()


    }
    catch (error) {
        res.status(400).json({ error })
    }
};


export {
    getAllUsers,
    getUserById,
    handleLogin,
    updatedUser
}