import mongoose from 'mongoose';
import softDelete from '../plugin/softDelete.js';
import taskPlugin from '../plugin/TaskPlugin.js';

const TaskSchema =  mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    importance: { type: String, enum: ['Critical', 'High', 'Medium', 'Low', 'Very'], required: true },
    status: { type: String, enum: ['unassigned','todo', 'in-progress', 'pending', 'completed', 'cancelled'],default:'unassigned'},
    dueDate: { type: Date},
    assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employe' }],
    relatedProject: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    expenses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }],       // Liste des dépenses liées à la tâche
    dateCreation: { type: Date, default: new Date() },
}, {
    timestamps: true
});

// TaskSchema.plugin(taskPlugin);
TaskSchema.plugin(softDelete);
export default mongoose.model('Task', TaskSchema);