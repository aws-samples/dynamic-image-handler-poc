# Welcome to Dynamic Image Handler CDK TypeScript project



## To Deploy

Ensure aws-cdk is installed and [bootstrapped](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html).

```bash
$ npm install -g aws-cdk
$ cdk bootstrap
```

Then build and deploy.

```bash
$ npm run build
$ cdk synth
$ cdk deploy
```

Delete the stack. Make sure to remove all the policies from the role before running destroy

```bash
$ cdk destroy
```

