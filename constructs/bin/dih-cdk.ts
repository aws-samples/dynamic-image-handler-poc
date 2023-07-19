#!/usr/bin/env node
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag'
import { App, Aspects } from 'aws-cdk-lib';

import { DIHCdkStack } from "../lib/dih-cdk-stack";
import { DIHStackProps } from "../lib/dih-stack-props";

const app = new App();
const props: DIHStackProps = {
  instanceType: "t3.medium",
  vpcCidr: "10.0.0.0/24",
};
const stack = new DIHCdkStack(app, "DIH-CDK-Stack", props);

// Nag checks

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

NagSuppressions.addStackSuppressions(stack, [

  { id: 'AwsSolutions-EC23', reason: 'ALB expose port 80 to users. Not an error' },
  { id: 'AwsSolutions-IAM5', reason: 'IAM wildcard resource. Not an error', appliesTo: ['Resource::*'] },
  { id: 'AwsSolutions-IAM5', reason: 'Keypair wildcard. Not an error', appliesTo: ['Resource::arn:<AWS::Partition>:ec2:*:*:key-pair/*'] },
  { id: 'AwsSolutions-IAM4', reason: 'Managed policy rule. Not an error', appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'] },
  { id: 'AwsSolutions-L1', reason: 'Not an error', appliesTo: ['Resource::*'] },
  {
    id: "AwsSolutions-L1",
    reason: "The lambda function runs appropriate runtime and does not require the latest version."
  },
  { id: 'AwsSolutions-AS3', reason: 'No notification setup for PoC' }

]);
