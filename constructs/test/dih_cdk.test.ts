
import * as cdk from 'aws-cdk-lib';
import { DIHCdkStack } from '../lib/dih-cdk-stack';
import { AwsSolutionsChecks } from 'cdk-nag'
import { App, Aspects } from 'aws-cdk-lib';
import { DIHStackProps } from '../lib/dih-stack-props';


const app = new App();
const props: DIHStackProps = {
  instanceType: "t2.micro",
  vpcCidr: "10.0.0.0/24",
};
//Test case for DIH CDK

describe('DIH CDK Test', () => {
  test('DIH CDK Stack', () => {
    const stack = new DIHCdkStack(app, 'DIH-CDK-Stack', props);

  });
});
// Nag checks


Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

