import express from 'express';
import * as dotenv from 'dotenv';
import cors from 'cors';
import connectDb from './mongodb/connect.js';
import 'dotenv/config';
import userRouter from './mongodb/routes/user.routes.js'
import serviceRouter from './mongodb/routes/service.routes.js';
import clientRouter from './mongodb/routes/client.routes.js'
import eventRouter from './mongodb/routes/event.routes.js'
import employeRouter from './mongodb/routes/employe.routes.js';
import projectRouter from './mongodb/routes/project.routes.js';
import taskRouter from './mongodb/routes/task.routes.js';
import activitiesRouter from './mongodb/routes/activities.routes.js';
import journalLogsRouter from './mongodb/routes/journalLogs.routes.js';
import expenseRouter from './mongodb/routes/expense.routes.js';
import paymentRouter from './mongodb/routes/payment.routes.js';
import objectiveRouter from './mongodb/routes/objective.routes.js';
import authenticateToken from './middleware/auth.js';
import connexion from './mongodb/routes/connexion.routes.js';
import { geoipMiddleware } from './middleware/location.js';
const app = express();

app.use(cors({
    origin: ['http://localhost:5173', 'https://baobab-admin.netlify.app'], // Spécifie l'origine autorisée
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Méthodes HTTP autorisées
    allowedHeaders: ['Content-Type', 'Authorization', 'x-email-creator'], // En-têtes autorisés
    credentials: true // Si vous devez inclure des cookies dans les requêtes
}));

app.use(express.json({ limit: '50mb' }));
app.get('/', (req, res) => {
    res.send({ message: 'hello world' })
});
app.use(geoipMiddleware)
app.use('/baobabapi/v1/connexion', connexion);
app.use('/baobabapi/v1/services', authenticateToken, serviceRouter);
app.use('/baobabapi/v1/tasks', authenticateToken, taskRouter);
app.use('/baobabapi/v1/users', authenticateToken, userRouter);
app.use('/baobabapi/v1/agents', authenticateToken, employeRouter);
app.use('/baobabapi/v1/clients', authenticateToken, clientRouter);
app.use('/baobabapi/v1/events', authenticateToken, eventRouter);
app.use('/baobabapi/v1/activities', authenticateToken, activitiesRouter);
app.use('/baobabapi/v1/journalLogs', authenticateToken, journalLogsRouter);
app.use('/baobabapi/v1/projects', authenticateToken, projectRouter);
app.use('/baobabapi/v1/expenses', authenticateToken, expenseRouter);
app.use('/baobabapi/v1/payments', authenticateToken, paymentRouter);
app.use('/baobabapi/v1/objectives', authenticateToken, objectiveRouter);






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