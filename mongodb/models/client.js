import mongoose from 'mongoose';
import mongooseUniqueValidator from 'mongoose-unique-validator';
import softDelete from '../plugin/softDelete.js';
import payment from './payment.js';

const ClientSchema = mongoose.Schema({
    name: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    gender: { type: String, required: true, enum: ['M', 'F', 'Other'] },
    email: { type: String, required: true, unique: true },
    company: { type: String, unique: true },
    industry: { type: String },
    dateCreation: { type: Date, required: true },
    project: [{ type: mongoose.Schema.Types.ObjectId, ref: 'project' }],
    event: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    payment: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }]
}, {
    timestamps: true
})

ClientSchema.plugin(mongooseUniqueValidator);
ClientSchema.plugin(softDelete);
export default mongoose.model('Client', ClientSchema);