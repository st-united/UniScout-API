<p align="center">
  <a href="https://nestjs.com/" target="blank"><img src="https://d33wubrfki0l68.cloudfront.net/e937e774cbbe23635999615ad5d7732decad182a/26072/logo-small.ede75a6b.svg" height="100" alt="Nest logo" /></a>
  <a href="https://typeorm.io/" target="blank"><img src="https://avatars.githubusercontent.com/u/20165699" height="100" alt="TypeORM logo" /></a>
  <a href="https://www.postgresql.org/" target="blank"><img src="https://www.postgresql.org/media/img/about/press/elephant.png" height="100" alt="PostgreSQL logo" /></a>
  <a href="https://prettier.io/" target="blank"><img src="https://prettier.io/icon.png" height="100" alt="Prettier logo" /></a>
  <a href="https://eslint.org/" target="blank"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/ESLint_logo.svg/648px-ESLint_logo.svg.png?20211012234406" height="100" alt="ESLint logo" /></a>
  <a href="https://docs.docker.com/" target="blank"><img src="https://www.docker.com/wp-content/uploads/2022/03/Moby-logo.png" height="60" alt="Docker logo" /></a>
</p>

# AICP - Backend

## Table of contents

- [AICP - Backend](#aicp---backend)
  - [Table of contents](#table-of-contents)
  - [Getting started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
  - [What's in the box ?](#whats-in-the-box-)
    - [Commitlint](#commitlint)
    - [Docker Compose](#docker-compose)
    - [ESLint](#eslint)
    - [Husky](#husky)
    - [Lint-staged](#lint-staged)
    - [Prettier](#prettier)
  - [Further help](#further-help)
  - [Useful Docker commands](#useful-docker-commands)
  - [Handle errors](#handle-errors)

---

## Getting started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

What things you need to install the software and how to install them :

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/)
- [Docker](https://docs.docker.com/docker-for-windows/install/) or [Docker Toolbox](https://github.com/docker/toolbox/releases)
- [Nest CLI](https://docs.nestjs.com/cli/overview)

---

### Installation

1. Clone the git repository

1. Go into the project directory

1. Checkout working branch

   ```bash
   git checkout <branch>
   ```

1. Install NPM dependencies

   ```bash
   npm i
   ```

1. Copy `.env.example` to `.env`

   ```bash
   cp .env.example .env
   ```

1. Replace the values of the variables with your own

1. Create Docker images and launch them

   ```bash
   docker-compose up -d --build
   ```

---

## What's in the box ?

### Commitlint

[commitlint](https://github.com/conventional-changelog/commitlint) checks if your commit messages meet the [conventional commit format](https://conventionalcommits.org).

**Configuration file**: [`.commitlintrc.json`](./.commitlintrc.json).

In general the pattern mostly looks like this:

```sh
type(scope?): subject  #scope is optional
```

---

### Docker Compose

**Compose file**: [`docker-compose.yml`](./docker-compose.yml).

Containers :

- Node 16
- PostgreSQL 14

Compose file uses `.env`.

---

### ESLint

[ESLint](https://eslint.org/) is a fully pluggable tool for identifying and reporting on patterns in JavaScript.

**Configuration file**: [`.eslintrc.js`](./.eslintrc.js).

For more configuration options and details, see the [configuration docs](https://eslint.org/docs/user-guide/configuring).

---

### Husky

[Husky](https://github.com/typicode/husky) is a package that helps you create Git hooks easily.

**Configuration folder**: [`.husky`](./.husky/).

---

### Lint-staged

[Lint-staged](https://github.com/okonet/lint-staged) is a Node.js script that allows you to run arbitrary scripts against currently staged files.

**Configuration file**: [`.lintstagedrc.json`](./.lintstagedrc.json).

---

### Prettier

[Prettier](https://prettier.io/) is an opinionated code formatter.

**Configuration file**: [`.prettierrc.json`](./.prettierrc.json).  
**Ignore file**: [`.prettierignore`](./.prettierignore).

For more configuration options and details, see the [configuration docs](https://prettier.io/docs/en/configuration.html).

---

## Further help

To get more help on the Nest CLI use `nest --help` or go check out the [Nest CLI README](https://github.com/nestjs/nest-cli/blob/master/README.md).

---

## Useful Docker commands

1. If you want to check that all containers are up :

   ```bash
   docker-compose ps
   ```

1. Other Docker commands :

   ```bash
   # Start Docker
   docker-compose start

   # Restart Docker
   docker-compose restart

   # Stop Docker
   docker-compose stop

   # Delete all containers
   docker rm $(docker ps -aq)

   # Delete all images
   docker rmi $(docker images -q)

   # Remove all volumnes
   docker volume prune
   ```

1. How to get a Docker container's IP address from the host ?

   ```bash
   docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' <container>
   docker inspect $(docker ps -f name=<service> -q) | grep IPAddress
   ```

## Deploy K8s Container

1. Change env to env production
2. Up tag version TTLX_TC_BE_DEV_REPO (0.0.4 to 0.0.5)
3. CMD "make build"
