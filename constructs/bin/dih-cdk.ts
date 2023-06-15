#!/usr/bin/env node
import {App} from 'aws-cdk-lib';
import { DIHCdkStack } from '../lib/dih-cdk-stack';
import { DIHStackProps } from '../lib/dih-stack-props';

const app = new App();
const props: DIHStackProps = {
  instanceType: 'm5.xlarge',
  vpcCidr: '10.0.0.0/24'
}
new DIHCdkStack(app, 'DIH-CDK-Stack', props);