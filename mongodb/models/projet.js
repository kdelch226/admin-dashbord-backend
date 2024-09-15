import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import softDelete from '../plugin/softDelete.js';

const projetSchema = mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String,required: true },
    startDate: { type: Date, required: true },
    initialBudget: { type: Number, required: true },
    ajustedBudget:{ type: Number },
    actualExpenses: { type: Number, default: 0 },
    estimatedEndDate: { type: Date,required: true },
    endDate: { type: Date },
    etat: {
        type: String,
        enum: ['En cours', 'Terminé', 'En attente', 'Annulé'],
        default: 'En cours',
      },
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }], 
    assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employe' }], 
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' }, 
    payment: [{type:mongoose.Schema.Types.ObjectId,ref:'Payment'}],
    expense:[{type:mongoose.Schema.Types.ObjectId, ref:'Expense'}]
    
}, {
    timestamps: true
});

projetSchema.plugin(uniqueValidator);
projetSchema.plugin(softDelete);
export default mongoose.model('Projet', projetSchema);