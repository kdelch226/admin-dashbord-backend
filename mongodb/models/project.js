import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import softDelete from '../plugin/softDelete.js';

const projectSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String,required: true },
    startDate: { type: Date, required: true },
    initialBudget: { type: Number, required: true },
    ajustedBudget:{ type: Number },
    budgetAdjustments: [
        {
            amount: Number,
            date: { type: Date, default: Date.now },
            reason: String,
        }
    ],
    actualExpenses: { type: Number, default: 0 },
    estimatedEndDate: { type: Date,required: true },
    endDate: { type: Date },
    status: {
        type: String,
        enum: ['In Progress', 'Completed', 'Waiting', 'Cancelled'],        default: 'In Progress',
      },
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }], 
    assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employe' }], 
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' }, 
    payment: [{type:mongoose.Schema.Types.ObjectId,ref:'Payment'}],
    expense:[{type:mongoose.Schema.Types.ObjectId, ref:'Expense'}],
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' }, 
}, {
    timestamps: true
});

projectSchema.plugin(uniqueValidator);
projectSchema.plugin(softDelete);
export default mongoose.model('Project', projectSchema); 