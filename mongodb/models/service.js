import uniqueValidator from "mongoose-unique-validator";
import mongoose from 'mongoose';
import softDelete from '../plugin/softDelete.js';


const ServiceSchema = mongoose.Schema({
    title: {type:String,required:true,unique:true},
    expertise: {type:String,required:true},
    description: {type:String,required:true},
    photo: {type:String,required:true},
    creator:{type:mongoose.Schema.Types.ObjectId,ref:'User'},
    project:[{type:mongoose.Schema.Types.ObjectId,ref:'Project'}]
},{
    timestamps:true
})

ServiceSchema.plugin(uniqueValidator);
ServiceSchema.plugin(softDelete);
export default mongoose.model('Service', ServiceSchema);