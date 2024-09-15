import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import connectDb from './mongodb/connect.js';
import 'dotenv/config';
import userRouter from './mongodb/routes/user.routes.js'
import serviceRouter from './mongodb/routes/service.routes.js';
import clientRouter from './mongodb/routes/client.routes.js'
import employeRouter from './mongodb/routes/employe.routes.js';
import projetRouter from './mongodb/routes/projet.routes.js';
import taskRouter from './mongodb/routes/projet.routes.js';

import authenticateToken from './middleware/auth.js';
import connexion from './mongodb/routes/connexion.routes.js';
import { geoipMiddleware } from './middleware/location.js';
const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.get('/', (req, res) => {
    res.send({ message: 'hello world' })
});
app.use(geoipMiddleware)
app.use('/baobabapi/v1/connexion',connexion);
app.use('/baobabapi/v1/services',authenticateToken,serviceRouter);
app.use('/baobabapi/v1/tasks',authenticateToken,taskRouter);
app.use('/baobabapi/v1/users',authenticateToken,userRouter);
app.use('/baobabapi/v1/agents',authenticateToken,employeRouter);
app.use('/baobabapi/v1/clients',authenticateToken,clientRouter);
app.use('/baobabapi/v1/projets',authenticateToken,projetRouter);




// VOIR SI CEST UN NUMERO DE PORT OU UN NOM DE PORT
const normalizePort = val => {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        return val;
    }
    if (port >= 0) {
        return port;
    }
    return false;
};

//PORT SUR LEQUEL ON ECOUTE
const port = normalizePort(process.env.PORT || '3000');

const startServer = async () => {
    try {
        connectDb(process.env.MONGODB_URL);
        const server = app.listen(port, () => {
            const address = server.address();
            const bind = typeof address === 'string' ? 'pipe ' + address : 'port ' + address.port;
            console.log('Listening on ' + bind);
        });
    } catch (error) {
        console.error('Error starting server:', error);
    }
}

startServer();