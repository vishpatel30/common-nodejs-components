# nodejs-commons

Shared components for NodeJS base microservices.
This repository is structured as collection of libraries/packages reused across the NodeJS based microservice applications.

## Repository structure

```bash
.
├── Makefile
├── README.md
├── jest.config.js
├── lerna.json
├── package-lock.json
├── package.json
├── packages
│   ├── errors                  # basic error types
│   ├── express-forward-error   # express error propagating middleware
│   ├── express-jwt-validator   # jwt validation and helpers
│   └── logger                  # logger with json format support
└── tsconfig.json
```

## Getting started

### Install

For general lerna usage please refer to the [docs](https://github.com/lerna/lerna).

- pre-commit hook using `pre-commit install`
- (optional) [lerna](https://lerna.js.org) using `npm i -g lerna`
- install root level dependencies using `npm i`
- link the packages `npm run bootstrap` or `lerna bootstrap`

### Build

```bash
# To build all packages
npm run build

# Or alternatively
lerna run build
```

### Test

```bash
# To test all packages
npm test

# Or alternatively
lerna run test
```

### Publish

```bash
# Publish packages to nexus repository
npm run publish

# Or alternatively
lerna run publish
```

## Adding new dependency

- [lerna add](https://github.com/lerna/lerna/tree/main/commands/add#readme)

```bash
# To add dependency (winston logger) to sample package
lerna add winston packages/arangodb-provider
```

## Adding new package

- [lerna create](https://github.com/lerna/lerna/tree/main/commands/create#readme)

```bash
# To init new package either copy existing one or run
lerna create @dataverse/my-new-package
```

> Note: If a new package is created and published, the access should be explicitly set from the package settings in GitHub. Go to the repo and click on the Packages link located on the right pane. Click on the package that is published. Click on the <abbr title="If you're the publisher you should see this link.">Settings link</abbr> on the right pane. Then, under the Manage Access section, check the "Inherit access from source repository (recommended)" checkbox.

![Inherit access screenshot](/doc/inherit_access.png)
