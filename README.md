# Edument AWS Workshop
This is the repository for the sample application implemented during the Edument workshop __Cloud Native Application Development with AWS Container Services__.

See `EXERCISES.md` for the list of exercises.

## Further reading

### Cloud native

[The twelve-factor app](https://12factor.net/)

[5 principles for cloud-native architecture](https://cloud.google.com/blog/products/application-development/5-principles-for-cloud-native-architecture-what-it-is-and-how-to-master-it)

[CNCF Cloud Native Glossay](https://glossary.cncf.io/)

### Docker
[docker.com](https://www.docker.com/)

[Documentation](https://docs.docker.com/)

[Docker Hub](https://hub.docker.com)

### AWS Copilot

[On AWS](https://aws.amazon.com/containers/copilot/)

[On GitHub](https://github.com/aws/copilot-cli)

[AWS CLI Installation](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

[AWS Copilot Installation](https://aws.github.io/copilot-cli/docs/getting-started/install/)

### Axios
[Axios request example](https://github.com/axios/axios?tab=readme-ov-file#example)


## Useful commands

### Docker
```
# List all images
docker image ls

# List all containers
docker ps -a

# Remove all containers 
docker rm $(docker ps -a -q)

# Remove all images
docker rmi $(docker images -q)

# Open shell inside a running container
docker exec -it [container] sh

# Explore an image 
docker run -it --rm [image_name] sh

```

### curl
```
# POST request
curl -X POST http://__HOST__/content

# POST request
curl http://__HOST__/healthz

```


