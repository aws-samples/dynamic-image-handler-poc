import { aws_ec2 as ec2 } from "aws-cdk-lib";

export interface DIHStackProps {
  vpcCidr?: string;
  lbScheme?: string;
  elbHealthCheckPath?: string;
  imageId?: string;
  instanceType: string;
  asgMinSize?: number;
  asgMaxSize?: number;
  asgDesiredSize?: number;
  userdata?: string;
  userdataEnvVars?: JSON;
}
