import mongoose from 'mongoose';
import softDelete from '../plugin/softDelete.js';

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    importance: { type: String, enum: ['Critical', 'High', 'Medium', 'Low', 'Very'],required:true },
    status: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
    dueDate: { type: Date, required: true },
    assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    relatedProject: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    dateCreation: { type: Date, default: new Date() },
}, {
    timestamps: true
});

taskSchema.plugin(softDelete);
export default mongoose.Model('Task',taskSchema);