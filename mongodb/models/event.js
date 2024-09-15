import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import softDelete from '../plugin/softDelete.js';


const eventSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    location: { type: String },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' }, // L'événement peut être lié à un client, optionnel
    relatedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // L'événement peut être lié à un projet, optionnel
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }], // Liste des employés associés
    externalParticipants: [{ name: String, contactInfo: String }], // Participants externes
}, {
    timestamps: true
});

eventSchema.plugin(uniqueValidator);
eventSchema.plugin(softDelete);
export default mongoose.Model('Event', eventSchema);
