# Welcome to Dynamic Image Handler CDK TypeScript project



## To Deploy

##### Ensure aws-cdk is installed and [bootstrapped](https://docs.aws.amazon.com/cdk/latest/guide/bootstrapping.html).

```bash
$ npm install -g aws-cdk
$ cdk bootstrap
```

##### Then build and deploy.

```bash
$ npm run build
$ cdk synth
$ cdk deploy
```

#### Cleanup 

!!!Note Make sure to remove all the policies from the role before running destroy

```
//List the role
aws iam list-roles | jq -r '.Roles[] | select(.RoleName|match("DIH-CDK-Stack-EC2IAMRole."))'

// Copy the full rolename (role-name)
// "RoleName" :

//List attached policy
aws iam list-attached-role-policies --role-name $role-name

// Copy Policy ARN (policy-arn)
//"AttachedPolicies"

//Detach the policies attached to the role
aws iam detach-role-policy --role-name $role-name --policy-arn $policy-arn

```

###### Stack cleanup   

```bash
$ cdk destroy
```

