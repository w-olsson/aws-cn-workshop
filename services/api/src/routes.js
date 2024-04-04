const express   = require('express');
const axios     = require('axios');

const {
    SNSClient,
    PublishCommand
} = require('@aws-sdk/client-sns');

const env = require('./env');

const routes = express.Router();


const sns = new SNSClient({
    region: 'eu-north-1'
});

// ...
// TMS API.
routes.post('/content', async (_, res) => {
    const response
        = await axios({
            method: 'POST',
            url: 'http://validator/resources'
        });

    const request 
        = response.data;

    await sns.send(new PublishCommand({
        Message: JSON.stringify(request.id),
        TopicArn: env.requestsTopic
    }));

    console.log('Content Request ID ' + request.id + ' published');

    res.send(request);
});

routes.post('/injectfault', async (_, res) => {
    const response = await axios({
        method: 'POST',
        url: 'http://validator/503'
    });

    res.send(response.data);
});

module.exports = routes;