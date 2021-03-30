# Subgraph for Kyber Governance

## Development

```bash
# copy env and adjust its content
cp .env.test .env
# choose env to deploy to
NETWORK=ropsten yarn prepare:subgraph
# run codegen
yarn codegen
# build
yarn build
```

## Deployment local

In the 1st terminal, start a graph node at local (you also need to config a node in .env file).

```bash
docker-compose up
```

In the 2nd terminal, create and deploy subgraph.

```bash
yarn create-local
yarn deploy-local
```

### Deployment to the graph api

```bash
#auth
yarn graph auth ....
# deploy
yarn deploy
```
