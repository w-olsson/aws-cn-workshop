const crypto = require('crypto');

const { 
  SQSClient, 
  DeleteMessageCommand,
  ReceiveMessageCommand 
} = require("@aws-sdk/client-sqs");

const env = require('./env');

const client = new SQSClient({ region: "eu-north-1" });

let running = true;

const stopRunning = () => {
  console.log('Exiting polling loop');

  running = false;
}

process.on('SIGINT', stopRunning);
process.on('SIGTERM', stopRunning);

const delay = delayMs => {
  return new Promise(resolve => {
    setTimeout(resolve, delayMs)
  });
};

let noProcessedMessages = 0;
const instanceId = crypto.randomUUID();

const processor = async () => {
  while (running) {
    const out = await client.send(new ReceiveMessageCommand({
      QueueUrl: env.queueUrl,
      WaitTimeSeconds: 15
    }));    
    
    if (!running) {
      console.log('Processor shutting down...');
      break;
    }

    if (out.Messages === undefined || out.Messages.length === 0) {
      // note: continue instead of return! 
      continue;
    }

    for (const message of out.Messages) {
      const {
        Body,
        ReceiptHandle
      } = message;

      const body      = JSON.parse(Body);
      const requestId = body.Message;

      // ...
      // Process message by updating the request status.
      await delay(1 * 1000);
      console.log(`Instance ${instanceId} processing request with ID: ${requestId}, (${++noProcessedMessages})`);

      await client.send(new DeleteMessageCommand({
        QueueUrl: env.queueUrl,
        ReceiptHandle
      }));
    } 
  }
}

processor();