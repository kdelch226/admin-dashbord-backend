import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const userSchema = mongoose.Schema({
    name: { type: String,  },
    email: { type: String, required: true, unique: true },
    number: { type: Number, unique: true },
    adress: { type: String },
    avatar: { type: String,  },
    allService: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    lastLogin: { type: Date, default: null },
    lastLogout: { type: Date, default: null },
    isOnline: { type: Boolean, default: false },

}, {
    timestamps: true
})

userSchema.plugin(uniqueValidator);
export default mongoose.model('User', userSchema);