import uniqueValidator from "mongoose-unique-validator";
import mongoose from 'mongoose';
import softDelete from '../plugin/softDelete.js';


const EmployeSchema = mongoose.Schema({
    name: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    gender: { type: String, required: true, enum: ['M', 'F', 'Other'] },
    email: { type: String, required: true, unique: true },
    dateEmbauche: { type: Date, required: true },
    post: { type: String, required: true },
    project: [{ type: mongoose.Schema.Types.ObjectId, ref: 'project' }],
    event: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
    task: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    status: {
        type: String,
        required: true,
        enum: ['Active', 'Inactive', 'Suspended', 'Completed'],
        default:'Active'
    },
    dateRenvoi: { type: Date }  // Facultatif, utilisé uniquement si l'état est "Terminé"

}, {
    timestamps: true
});


EmployeSchema.plugin(uniqueValidator);
EmployeSchema.plugin(softDelete);
export default mongoose.model('Employe', EmployeSchema);