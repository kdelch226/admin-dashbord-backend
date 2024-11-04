import mongoose from 'mongoose';
import Event from '../models/event.js'
import Audit from '../models/audit.js';
import User from '../models/user.js';
import Client from '../models/client.js';
import Employe from '../models/employe.js';


// cloudinary.config({
//     cloud_name: process.env.CLOUNDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUNDINARY_CLOUD_KEY,
//     api_secret: process.env.CLOUNDINARY_CLOUD_SECRET
// });

const getAllEvents = async (req, res) => {
    try {
        const { _end, _order, _start, _sort, title_like = '', upcoming = false
        } = req.query;

        let query = {}

        if (upcoming) {
            const today = new Date();
            query.startDate = { $gt: today };
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

        const count = await Event.countDocuments({ query })
        const Events = await Event
            .find(query)
            .limit(_end)
            .skip(_start)
            .sort(sort);

        res.header('x-total-count', count)
        res.header('Acces-Control-Expose-Headers', 'x-total-count')

        res.status(200).json(Events)
    }
    catch (error) {
        res.status(500).json({ error })
    }
}

const getEventByID = async (req, res) => {
    const { id } = req.params;
    await Event.findOne({ _id: id })
        .populate('tasks')
        // .populate('assignedEmployees')
        .populate('client')
        .populate('assignedEmployees')
        .then((event) => {
            if (!event) res.status(404).json({ message: 'Event not found' })
            else {
                res.status(200).json(event)
            }
        })
        .catch((error) => {
            res.status(500).json({ error })
        });
}
const creatEvents = async (req, res) => {
    const { title, description, startDate, endDate, location, initialBudget, importance, RecurrenceRule } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();
    const email = req.get('X-Email-Creator');

    try {
        const user = await User.findOne({ email }).session(session);
        if (!user) throw new Error('User not found');

        if (startDate > endDate) throw new Error('startDate is earlier than endDate');

        const newEvent = new Event({
            title,
            description,
            startDate,
            endDate,
            location,
            initialBudget,
            importance,
            RecurrenceRule
        });

        await newEvent.save({ session });

        const auditLog = new Audit({
            action: 'create',
            documentId: newEvent._id,
            documentType: 'Event',
            changedBy: email,
            changes: { newEvent },
            timestamp: new Date(),
        });

        await auditLog.save({ session });

        await session.commitTransaction();
        res.status(201).json({ message: 'Event created successfully' });
    } catch (error) {
        await session.abortTransaction();
        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({ error: 'Validation error: ' + error.message });
        }
        res.status(500).json({ error: 'An error occurred while creating the event.' });
    } finally {
        session.endSession();
    }
}



const updatedEvents = async (req, res) => {
    const email = req.get('X-Email-Creator');
    const { id } = req.params;
    const { clientsIds, employesIds, projectIds, ...updatedData } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // // Update all events that do not have assignedEmployees
        // await Event.updateMany(
        //     { assignedEmployees: { $exists: false } }, // Filter condition
        //     { assignedEmployees: [] }, // Update
        //     { session } // Add session here
        // );

        // await Employe.updateMany(
        //     { event: { $exists: false } }, // Filter condition
        //     { event: [] }, // Update
        //     { session } // Add session here
        // );

        // await Client.updateMany(
        //     { event: { $exists: false } }, // Filter condition
        //     { event: [] }, // Update
        //     { session } // Add session here
        // );

        const originalEvent = await Event.findById(id);
        if (!originalEvent) res.status(404).json({ message: 'Event not found' });

        const changes = {}
        let changesEmployes = [];
        let changesClients = [];
        // Update the specified event
        const updatedEvent = await Event.findByIdAndUpdate(
            id,
            { $set: updatedData },
            { new: true, runValidators: true, session } // Add session here
        );

        if (!updatedEvent) {
            await session.abortTransaction(); // Abort the transaction if the event is not found
            return res.status(404).json({ message: 'Event not found' });
        }

        // Employee processing
        if (employesIds) {
            for (const employeId of employesIds) {
                const employeExists = await Employe.find({ _id: employeId }).session(session);
                if (!employeExists) {
                    await session.abortTransaction(); // Abort the transaction if the employee does not exist
                    return res.status(404).json({ message: 'Employee not found' });
                }

                await Event.findByIdAndUpdate(
                    id,
                    { $addToSet: { assignedEmployees: employeId } },
                    { new: true, session } // Add session here
                );

                await Employe.findByIdAndUpdate(
                    employeId,
                    { $addToSet: { event: id } },
                    { new: true, session } // Add session here
                );

                changesEmployes.push({ name: employeExists.name, id: employeId });
            }
        }

        // Client processing
        if (clientsIds) {
            for (const clientId of clientsIds) {
                const clientExists = await Client.find({ _id: clientId }).session(session);
                if (!clientExists) {
                    await session.abortTransaction(); // Abort the transaction if the client does not exist
                    return res.status(404).json({ message: 'Client not found' });
                }

                await Event.findByIdAndUpdate(
                    id,
                    { $addToSet: { client: clientId } },
                    { new: true, session } // Add session here
                );

                await Client.findByIdAndUpdate(
                    clientId,
                    { $addToSet: { event: id } },
                    { new: true, session } // Add session here
                );

                changesClients.push({ name: clientExists.name, id: clientId });
            }
        }

        Object.keys(updatedData).forEach((key) => {
            if (!originalEvent[key]) changes[key] = { add: updatedEvent[key] }
            if (originalEvent[key] != updatedData[key]) {
                changes[key] = {
                    before: originalEvent[key],
                    after: updatedData[key]
                }
            }
        })

        if (changesEmployes) changes.Employes = { addEmployes: changesEmployes };
        if (changesClients) changes.Clients = { addClients: changesClients };
        // Log the changes in the audit log
        const auditLog = new Audit({
            action: 'update', // Change 'delete' to 'update'
            documentId: id,
            documentType: 'Event',
            changedBy: email,
            changes: changes,
            timestamp: new Date(),
        });
        await auditLog.save({ session }); // Ensure to save the audit log with the session

        await session.commitTransaction(); // Commit the transaction
        res.status(200).json({ message: 'Event updated successfully' });
    } catch (error) {
        await session.abortTransaction(); // Abort the transaction in case of an error

        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({ error: 'Validation error: ' + error.message });
        }
        res.status(500).json({ error: 'An error occurred while updating the event.' });
    } finally {
        session.endSession(); // End the session
    }

}

const deleteEvent = async (req, res) => {
    const { id } = req.params;
    const email = req.get('X-Email-Creator');
    const session = await mongoose.startSession();
    session.startTransaction();

    console.log('delete id', id)
    try {
        const eventToDelete = await Event.findOne({ _id: id }).populate('client').session(session);
        if (!eventToDelete) {
            throw new Error('Event not found');
        }
        const auditLog = new Audit({
            action: 'delete',
            documentId: id,
            documentType: 'Event',
            changedBy: email,
            changes: eventToDelete,
            timestamp: new Date(),
        });
        await eventToDelete.softDelete();
        await auditLog.save({ session });
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ message: 'Event Deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}

const removeClientFromEvent = async (req, res) => {
    const email = req.get('X-Email-Creator');
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const { eventId, id } = req.params;

        // Retirer le client du Event
        const updatedEvent = await Event.findByIdAndUpdate(
            eventId,
            { $unset: { client: "" } },
            { new: true, session }
        );

        if (!updatedEvent) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Event not found' });
        }

        // Retirer le Event de la liste des Events du client
        await Client.findByIdAndUpdate(
            id,
            { $pull: { event: eventId } },
            { new: true, session }
        );

        // Commit the transaction
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: 'Client removed from Event successfully' });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ error: 'An error occurred while removing the client from the Event' });
    }
};
const removeEmployeFromEvent = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    const email = req.get('X-Email-Creator');


    try {
        const { eventId, id } = req.params;

        // Remove the employee from the Event
        const updatedEvent = await Event.findByIdAndUpdate(
            EventId,
            { $pull: { assignedEmployees: id } },
            { new: true, session }
        );

        if (!updatedEvent) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Event not found' });
        }

        // Remove the Event from the employee's list of Events
        const updatedEmployee = await Employe.findByIdAndUpdate(
            id,
            { $pull: { event: EventId } },
            { new: true, session }
        );

        if (!updatedEmployee) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Commit the transaction
        await session.commitTransaction();
        res.status(200).json({ message: 'Employee removed from Event successfully' });
    } catch (error) {
        console.error('Error removing employee from Event:', error);
        await session.abortTransaction();
        res.status(500).json({ error: 'An error occurred while removing the employee from the Event' });
    } finally {
        session.endSession(); // Ensure session ends in the finally block
    }
};

export {
    getAllEvents,
    getEventByID,
    creatEvents,
    updatedEvents,
    deleteEvent,
    removeClientFromEvent,
    removeEmployeFromEvent
}
