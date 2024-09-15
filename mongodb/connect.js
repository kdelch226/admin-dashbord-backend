import mongoose from 'mongoose';

const connectDb=(url)=>{
    mongoose.set('strictQuery',true);
    
    mongoose.connect(url)
    .then(() => console.log('Connexion MongoDB succed !'))
    .catch((e) => console.log(e));
}

export default connectDb;