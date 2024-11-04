import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import softDelete from '../plugin/softDelete.js';


const eventSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    recurrenceRule: { type: String }, 
    location: { type: String },
    client: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }], // L'événement peut être lié à un client, optionnel
    initialBudget: { type: Number},
    ajustedBudget:{ type: Number },
    expense:[{type:mongoose.Schema.Types.ObjectId, ref:'Expense'}],
    importance: { type: String, enum: ['Critical', 'High', 'Medium', 'Low', 'Very'] },
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }], 
    relatedProjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }], // L'événement peut être lié à un project, optionnel
    assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employe' }], // Liste des employés associés
    externalParticipants: [{ name: String, contactInfo: String }], // Participants externes
    RecurrenceRule:{type:String},
}, {
    timestamps: true
});

eventSchema.plugin(uniqueValidator);
eventSchema.plugin(softDelete);
export default mongoose.model('Event', eventSchema);
