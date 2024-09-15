import uniqueValidator from "mongoose-unique-validator";
import mongoose from 'mongoose';
import softDelete from '../plugin/softDelete.js';


const EmployeSchema = mongoose.Schema({
    name: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    gender: { type: String, required: true, enum: ['M','F','Other']},
    email: { type: String, required: true, unique: true },
    dateEmbauche: { type: Date, required: true },
    post: { type: String, required: true },
    projet:[{type:mongoose.Schema.Types.ObjectId,ref:'Projet'}],
    event:[{type:mongoose.Schema.Types.ObjectId,ref:'Event'}],
    task:[{type:mongoose.Schema.Types.ObjectId,ref:'Task'}],
    etat: {
        type: String,
        required: true,
        enum: ['Actif', 'En congé', 'Suspendu', 'En probation', 'Terminé', 'En formation', 'Retraité']
    },
    dateRenvoi: { type: Date }  // Facultatif, utilisé uniquement si l'état est "Terminé"

},{
    timestamps:true
});


EmployeSchema.plugin(uniqueValidator);
EmployeSchema.plugin(softDelete);
export default mongoose.model('Employe', EmployeSchema);