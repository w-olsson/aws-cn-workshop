const express   = require('express');
const env       = require('./env');
const routes    = require('./routes');

const app = express();
app.use(express.json());
app.use('/', routes);

// ...
// Healthcheck
app.get('/healthz', (_, res) => {    
    res.send('Service is healthy');
});

const server = app.listen(env.port, () => {
    console.log(`Listening on port ${env.port}`)
});

// ...
// Shut down gracefully
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received, about to shut down API server');

    server.close(() => {
        console.log('API server shut down gracefully');

        // other connections and resources to clean up...

        process.exit(0);
    });
});