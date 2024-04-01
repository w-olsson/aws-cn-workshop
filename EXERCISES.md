# Exercises
Description of exercises for the _Translation Management Systems (TMS)_ sample application implemented during the workshop __Cloud Native Application Development with AWS Container Services__.

**Make sure to read and follow the instructions for each exercise carefully!**

## Aborting Deployment
If an error occurs while deploying code (or if you just want to stop a deployment) with the AWS Copilot CLI, you may use _Ctrl+C_ to conduct a roll back.

## Exercise 1: TMS API 
In this exercise, an AWS Copilot [Load Balanced Web Service](https://aws.github.io/copilot-cli/docs/concepts/services/#load-balanced-web-service) for the _TMS API_ is created and deployed.

A basic API server exists in `src/api` with the following endpoint defined to accept a content request in `src/api/routes.js`:

    POST  /content

> The route just returns a (dummy) response of 'OK' for now.

A Load Balanced Web Service must support _health checks_ and handle shutdowns gracefully:

*   Add a health check route for `GET /healthz` that simply responds with a status code of _200_ (OK).

*   Handle the SIGTERM signal for graceful shutdown.

    This [article](https://aws.amazon.com/blogs/containers/graceful-shutdowns-with-ecs/) describes graceful shutdown in AWS ECS - search "Node handler" for a Node example. 
    
    **[Close](https://nodejs.org/api/http.html#serverclosecallback) the Express server upon shutdown** (and add a log message to indicate that this occurs).

Test the containerized API server by:

*   Building its Docker image:

        docker build -t tms-api:v1 . 

*   Run a container:

        docker run -d -p 80:80 tms-api:v1

*   Verify that the API server works by sending a request to one of the endpoints.

*   Stop the container by running:

        docker stop <CONTAINER_ID>

    > Get the CONTAINER_ID via `docker ps`.

*   Check that the API server was shut down gracefully (your shutdown message should've been logged):

        docker logs <CONTAINER_ID>

*   Remove the container and image (locally):

        docker rm <CONTAINER_ID>
        docker rmi tms-api:v1

### Deployment
Create a Copilot application by running:

    copilot app init

in the **project root folder** and following the instructions.

> Note: The name of the _application_ should be `tms`.
> > _You can see the progress and result in AWS Console > Cloudformation > Stacks_

Next, create and deploy a **test** environment for our application:

    copilot env init --name test

> Select your _default_ AWS profile and _Default environment configuration_ when prompted.

    copilot env deploy --name test

Next, create the _TMS API_ service:

    copilot svc init --name api --svc-type "Load Balanced Web Service" --dockerfile services/api/Dockerfile

Open `copilot/api/manifest.yml` and change:

*   The path for the [health check](https://aws.github.io/copilot-cli/docs/manifest/lb-web-service/#http-healthcheck) to `/healthz`. 

Finally, run:

    copilot svc deploy --name api

Test the API running on AWS by invoking the Load Balanced Web Service URL and the aforementioned API endpoints  (replace `AWS_LB_URL` with your Load Balanced Web Service URL).

    curl http://<AWS_LB_URL>/healthz

    curl -X POST http://<AWS_LB_URL>/content
    
> Tip: To get info about a service, such as the Load Balanced Web Service URL, run `copilot svc show`.

## Exercise 2: Service-to-Service Communication
In this exercise, an AWS Copilot [Backend Service](https://aws.github.io/copilot-cli/docs/concepts/services/#backend-service) for the _TMS Validator_ service is created and deployed.

The _TMS Validator_ service will be invoked directly (synchronously) by the _TMS API_.

In the `services/api` folder:

*   In `src/routes.js`, for the available routes, use the `axios` library to make the required calls to the _TMS Validator_ service.

    > Note: The URL of the _TMS Validator_ service will be: `http://validator`.

In the `services/validator` folder:

*   In `src/index.js`, add (_only_) SIGTERM handling, just like you did for the _TMS API_ service in the previous exercise. 

You can use [Docker Compose](https://docs.docker.com/compose/) to locally test the interaction between the two services:

*   Create a folder named `etc` in the `services` folder and in it, add a file named `docker-compose-ex2.yaml` with the following:

    ```
    services:
        api:
            build: ../api/
            ports:
                - "80:80"
        validator:
            build: ../validator
    ```

    This sets up two services named `api` and `validator`.

    > Why aren't `ports` defined for the `validator` service?

*   Launch the two services (from the `etc` folder):

        docker compose -f docker-compose-ex2.yaml up --build

*   In a second terminal window, invoke the API server:

        curl -X POST http://localhost/content

    In the first terminal windows (where Docker Compose is running), you should see a log statement from the _TMS Validator_ service, indicating that service-to-service communication was successful.

*   Ctrl+C to shut down Docker Compose.

To create and deploy the _TMS Validator_ service, in the **project root** folder:

*   Create the _TMS Validator_ service:

        copilot svc init --name validator --svc-type "Backend Service" --dockerfile services/validator/Dockerfile 

*   Deploy the _TMS Validator_ service:

        copilot svc deploy --name validator

*   Redeploy the _TMS API_ service:

        copilot svc deploy --name api

*   Invoke your updated API server (replace `AWS_LB_URL` with your Load Balanced Web Service URL):

        curl -X POST http://<AWS_LB_URL>/content

*   Check the logs of the _TMS Validator_ service to see that it's handled a request from _TMS API_:

        copilot svc logs --name validator

### Resiliency
ECS Service Connect allows for automatic request retries if a service instance fails with e.g. a 503 status code; it transparently resends a failed request to a healthy instance, meaning the client doesn't have to embed retry logic explicitly in its code.

You can enable and observe this as follows:

*   Increase the [number](https://aws.github.io/copilot-cli/docs/manifest/backend-service/#count) of _TMS Validator_ service instances to **2** in `copilot/validator/manifest.yml`. 

*   In the `services/validator` folder, use the `fault` Express middleware defined in `src/middleware.js` in the Express application created in `src/index.js`.

    The `fault` middleware intercepts call to an `/503` endpoint and injects 503 responses for 3 minutes. 

*   In the `services/api` folder, add a route `/injectfault` in `src/routes.js` that invokes the _TMS Validator_ service's `/503` endpoint:

            routes.post('/injectfault', async (_, res) => {
                const response = await axios({
                    method: 'POST',
                    url: 'http://validator/503'
                });

                res.send(response.data);
            });

*   Redeploy the _TMS Validator_ service:

        copilot svc deploy --name validator

*   Redeploy the _TMS API_ service:

        copilot svc deploy --name api

Once redeployment is finished: 

*   Inject fault into one of the _TMS Validator_ service instances:

        curl -X POST http://<AWS_LB_URL>/injectfault

    > `<AWS_LB_URL>` is again the Load Balanced Web Service URL for the _TMS API_. 

*   Send a number of requests:

        // bash
        sudo apt update
        sudo apt install siege

        # confirm installation
        siege --version

        // ubuntu
        siege -r 5 -c 2 "http://<AWS_LB_URL>/content POST"
        

        // macOS.
        ab -n 10 -m POST http://<AWS_LB_URL>/content

In the AWS Console, view the logs for the _TMS Validator_ service (and its two tasks). You should see that after fault injection, _all_ subsequent requests are forwarded to the healthy task.

## Exercise 3: PubSub
In this exercise, a [Worker Service](https://aws.github.io/copilot-cli/docs/concepts/services/#worker-service) for processing content requests is created and deployed.

The _TMS API_ service will be modified to act as the _publisher_ of content requests.

### TMS Processor (Worker Service / subscriber)
The sample code in the [documentation](https://aws.github.io/copilot-cli/docs/developing/publish-subscribe/#javascript-example_1) illustrates how to implement a SQS subscriber.

> Make sure you change the region to match yours!

> Notice the `COPILOT_QUEUE_URI` environment variable - this is the address of the queue from which content requests are be consumed and processed (it's also available via `env.queueUrl` - see `services/processor/src/env.js`).

The sample code in the documentation currently does not run repeatedly to consume requests from the queue (it does so only once). Implement continuous request processing in `services/processor/src/index.js` by following the _TODOs_ and comments. 

To test the processor locally:

*   Create a new SQS queue using the AWS Console; copy the queue URI (referred to as `<MY_QUEUE_URI>` below).

*   Run the processor (in `services/processor`):

        npm install

        COPILOT_QUEUE_URI=<MY_QUEUE_URI> node src/index.js
        
*   In the AWS Console, send a message to the queue with the following body:

        {"Message":"1234"}

    The processor should log the received message.

*   Ensure that Ctrl+C ends the loop and thereby shuts down the processor gracefully.

    > What is the (estimated) maximum duration for the processor to terminate?

### TMS API (publisher)
Modify `copilot/api/manifest.yml` to allow the _TMS API_ to publish requests to the queue (see more [here](https://aws.github.io/copilot-cli/docs/developing/publish-subscribe/#sending-messages-from-a-publisher)):

> Name your topic __requestsTopic__.

In `services/api`:

*   Modify `src/env.js` to parse and export the name of the topic (also an environment variable):

        const {
            requestsTopic
        } = JSON.parse(process.env.COPILOT_SNS_TOPIC_ARNS);

        module.exports = {
            port,
            requestsTopic // <---
        };

*   In `src/routes.js`, for the POST route, publish a request to the queue using the [documentation's sample code](https://aws.github.io/copilot-cli/docs/developing/publish-subscribe/#javascript-example) as a starting point.

    > Remember to change the SNS client to be your region!

    > Instead of the `Message` being `"hello"`, set it to the ID returned by the call to the _TMS Validator_ service.

### Deployment
In the **project root** folder, deploy the changes to the _TMS API_ service:

    copilot svc deploy --name api

Add the new `processor` Worker Service:

    copilot svc init --name processor --svc-type "Worker Service" --dockerfile services/processor/Dockerfile

> Make sure that the suggested `requestsTopic` is selected - marked as [x] by pressing space!

    copilot svc deploy --name processor

After deployment, follow the logs of the `processor` Worker Service in realtime:

    copilot svc logs --name processor --follow

When POSTing a new content request to `http://<AWS_LB_URL>/content`, you should see the `processor` Worker Service logging the request ID shortly thereafter.

### Service Autoscaling
The number of Worker instances can be dynamically and automatically adjusted based on a custom metric that takes into account _the average message processing time_ and _the acceptable latency_ (how long on average a message should remain in the queue before being consumed).

> Read more in the [documentation](https://aws.github.io/copilot-cli/docs/manifest/worker-service/#count-queue-delay) on using this "queue delay" scaling policy.

To enable autoscaling, in `copilot/services/processor`:

*   Set the range of instances to be between **1** (min) and **5** (max).

*   Set the `acceptable_latency` to be **10s** (for our purposes, this allows the autoscaling to commence faster).

*   Set the `msg_processing_time` to be **1s**.

    > How many "tasks per instance" does this amount to, and what does that imply in terms of the average amount of messages in the queue at any given time?

*   In `services/processor/src/index.js`, simulate a "processing time" of **1s** in the `processor` function, using the `delay` helper.

*   Redeploy the _TMS Processor_ service.

To observe autoscaling, send a large number of requests to _TMS API_:

    // ubuntu
    siege -r 1000 -c 1 "http://<AWS_LB_URL>/content POST"
    
    // macOS.
    ab -n 1000 -m POST http://<AWS_LB_URL>/content

After a while, AWS CloudWatch will trigger an alarm that will invoke the scaling policy; the maximum number of instances should now have been started.

## Exercise 5: Pipeline
In this exercise, you will create an automated [pipeline](https://aws.github.io/copilot-cli/docs/concepts/pipelines/) to build and deploy services to your _test_ environment.

In the **project root**, run:

    copilot pipeline init --name tms-pipeline

> Choose **Workloads** as the pipeline type, and **test** for your environment.

**Commit and push the changes (a `copilot/pipelines` folder has been added) to the repo.**

Run:

    copilot pipeline deploy

The connection between AWS and Github needs to be completed:

*   Navigate to https://console.aws.amazon.com/codesuite/settings/connections

*   Click "Update pending connection" and follow the steps.

To test the pipeline, make a change to a source file in any of the services, then commit and push the change; to follow the pipeline status, run:

    copilot pipeline status

You can also follow the progress in the AWS Console, go to **CodePipeline**.

## Cleanup
When finished with the exercise, remove the application and all deployed resources by running the following in the **project root**:

    copilot app delete
