const express   = require('express');
const env       = require('./env');
const fault     = require('./middleware');
const routes    = require('./routes');

const app = express();
app.use(express.json());
app.use(fault);
app.use('/', routes);

app.listen(env.port, () => {
    console.log(`Listening on port ${env.port}`)
});

// ...
// Sigterm handling only
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received, validator service shut down');
});