import Auditslog from "../models/auditslog.js";
import Audit from '../models/audit.js';
import User from "../models/user.js";
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

        const newAuditLog = await new Auditslog({
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

    console.log('test')
    try {
        const { name, email, avatar } = req.body;

        const userExist = await User.findOne({ email }).session(session);
        let userObjet = {};

        if (userExist) {
            if (userExist.name > 0 && userExist.avatar > 0) userObjet = userExists;
            else {
                const userUpdated = await User.findByIdAndUpdate(
                    userExist._id,
                    {
                        name,
                        avatar,
                    },
                    { new: true, session } // Add session here
                );
                const newAudit = new Audit({
                    action: 'Update',
                    documentId: userExist._id,
                    documentType: 'user',
                    changedBy: email,
                    changes: {
                        name: name,
                        avatar: avatar,
                    },
                    timestamp: new Date(),
                });

                await newAudit.save({ session });

                userObjet = userUpdated;
            }

        }
        else {
            console.log(error)
            return res.status(404).json({ message: 'user not found' })
        }



        await logAudit(req, userObjet._id, 'login');
        await session.commitTransaction()
        res.status(200).json(userObjet);
    } catch (error) {
        await session.abortTransaction(); // Abort transaction on error
        res.status(500).json({ message: error.message });
    }
};

const createAdmin = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const email = req.get('X-Email-Creator');
    const { newEmail } = req.body;
    try {

        const userExists = await User.findOne({ email: newEmail }).session(session);

        if (userExists) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'user already exist' });
        }

        const newUser = new User({
            email: newEmail,
        })

        await newUser.save({ session });

        const newAudit = new Audit({
            action: 'Create',
            documentId: newUser._id,
            documentType: 'user',
            changedBy: email,
            changes: { email: newEmail },
            timestamp: new Date(),
        });

        await newAudit.save({ session });
        await session.commitTransaction()
        res.status(200).json({ message: 'Admin added Succesfuly' });
    } catch (error) {
        await session.abortTransaction(); // Abort transaction on error
        console.log('create user ', error);
        res.status(500).json({ message: error.message });
    } finally {
        await session.endSession();
    }
}

export const handleLogout = async (req, res) => {

    const userExists = await User.findOne({ email }).session(session);

    await logAudit(req, userExists._id, 'logout');

    res.send('Logout successful');
};

const updatedUser = async (req, res) => {
    const session = await mongoose.startSession()
    session.startTransaction();
    try {
        const { id } = req.params;
        const { number, adress } = req.body;

        const updateFields = {
            number,
            adress
        }

        await User.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, session }
        )
        const newAudit = new Audit({
            action: 'Update',
            documentId: id,
            documentType: 'user',
            changedBy: email,
            changes: { number, adress },
            timestamp: new Date(),
        });

        await newAudit.save({ session });

    }
    catch (error) {
        res.status(400).json({ error })
    } finally {
        await session.endSession();
    }
};


export {
    getAllUsers,
    getUserById,
    handleLogin,
    updatedUser,
    createAdmin
}