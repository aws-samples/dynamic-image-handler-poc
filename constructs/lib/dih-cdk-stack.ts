import { Construct } from "constructs";
import { Aspects, CfnMapping, CfnOutput, CfnParameter, Stack, StackProps, Tags } from "aws-cdk-lib";
import { NagSuppressions } from 'cdk-nag';


import * as cdk from "aws-cdk-lib";
import {
  aws_ec2 as ec2,
  aws_elasticloadbalancingv2 as elb,
  aws_autoscaling as asg,
  aws_secretsmanager as secretsmanager,
  aws_iam as iam,
  aws_logs as cwlogs,
  aws_kms as kms,
} from "aws-cdk-lib";
import * as path from "path";
import * as fs from "fs";
import { DIHStackProps } from "./dih-stack-props";
import { KeyPair } from "cdk-ec2-key-pair";

/**
 * @author Madhu Balaji
 *
 * This class is the main class for the DIH CDK stack.
 */

export class DIHCdkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly KmsKey: kms.Key;
  public readonly IAMRole: iam.Role;

  public readonly ALBSecurityGroup: ec2.SecurityGroup;
  public readonly EC2SecurityGroup: ec2.SecurityGroup;
  public readonly loadBalancer: elb.CfnLoadBalancer;

  public readonly CfnLaunchConfiguration: asg.CfnLaunchConfiguration;
  public readonly CfnLaunchTemplate: ec2.CfnLaunchTemplate;
  public readonly CfnAutoScalingGroup: asg.CfnAutoScalingGroup;
  public readonly CfnLoadBalancer: elb.CfnLoadBalancer;
  public readonly CfnDefaultALBTargetGroup: elb.CfnTargetGroup;
  public readonly CfnALBDefaultListener: elb.CfnListener;
  public readonly CfnALBDefaultListenerRule: elb.CfnListenerRule;
  public readonly Secret: secretsmanager.Secret;
  public readonly VpcFlowLogGroup: cwlogs.LogGroup;
  private readonly defaultLBProtocol = "HTTP";
  private readonly defaultListenerActionType = "forward";

  private readonly httpPort: number = 80;
  private readonly httpsPort: number = 443;
  private readonly matcherHttpCode = "200-299";
  private readonly elbTgHealthCheckPath = "/";
  private readonly defaultLoadBalancerScheme = "internet-facing";
  private readonly defaultLBPort = 80;
  private readonly defaultASGCapacity = 2;

  constructor(scope: cdk.App, id: string, props: DIHStackProps) {
    super(scope, id);

    // Defining a VPC for the application
    this.VpcFlowLogGroup = new cwlogs.LogGroup(this, "VPCFlowLogs", { removalPolicy: cdk.RemovalPolicy.DESTROY });
    const role = new iam.Role(this, "VpcFlowLogRole", {
      assumedBy: new iam.ServicePrincipal("vpc-flow-logs.amazonaws.com"),
    });

    this.vpc = this.addVpc(props);
    this.vpc.addFlowLog("FlowLog", {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(this.VpcFlowLogGroup, role),
    });

    this.vpc.publicSubnets.forEach((element) => {
      let subnet = element.node.defaultChild as ec2.CfnSubnet;
      subnet.mapPublicIpOnLaunch = false;
    });

    // Defining a Security Group for the application
    // Create Security group for AWS resources
    this.ALBSecurityGroup = this.createALBSecurityGroup();
    this.EC2SecurityGroup = this.createEC2SecurityGroup();

    // Create load balancer in the above created VPC
    this.CfnLoadBalancer = this.addLoadBalancer(props);

    // Create Target Groups for Load Balancer
    this.CfnDefaultALBTargetGroup = this.addDefaultTargetGroup(props);

    // Create IAM Role for EC2 instance
    this.IAMRole = this.addIAMRole();

    // Create ASG - Launch template
    this.CfnLaunchTemplate = this.addLaunchTemplate(props);

    // Waiting for VPC creation to complete
    this.CfnLaunchTemplate.node.addDependency(this.vpc);

    // Create auto scaling group in above created VPC
    this.CfnAutoScalingGroup = this.addAutoScalingGroup(props);

    // Add a default listener to Application Load Balancer
    this.CfnALBDefaultListener = this.addDefaultListener();

    // Add listener rules to Application Load Balancer
    this.CfnALBDefaultListenerRule = this.addDefaultListenerRule();

    // Add Outputs to CloudFormation stack
    this.addOutputsToCloudFormationTemplate();
  }

  /**
   * Function to add VPC resource to CloudFormation stack.
   * @param props  Properties of the construct.
   * @returns VPC resource.
   */
  private addVpc(props: DIHStackProps): ec2.Vpc {
    return new ec2.Vpc(this, "DynamicImageHandlerVPC", {
      subnetConfiguration: [
        {
          name: "DIHLoadBalancer",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "DIHApp",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });
  }

  /**
   * Function to add ALB Security Group resource to CloudFormation stack.
   * @returns Security Group resource.
   */
  private createALBSecurityGroup(): ec2.SecurityGroup {
    var securityGroup = new ec2.SecurityGroup(this, "DIHALBSecurityGroup", {
      vpc: this.vpc,
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));

    return securityGroup;
  }

  /**
   * Function to add EC2 Security Group resource to CloudFormation stack.
   * @returns Security Group resource.
   */
  private createEC2SecurityGroup(): ec2.SecurityGroup {
    var securityGroup = new ec2.SecurityGroup(this, "DIHEC2SecurityGroup", {
      vpc: this.vpc,
      allowAllOutbound: true,
    });
    this.vpc.publicSubnets.forEach((element) => {
      securityGroup.addIngressRule(ec2.Peer.ipv4(element.ipv4CidrBlock), ec2.Port.tcp(80));
      securityGroup.addIngressRule(ec2.Peer.ipv4(element.ipv4CidrBlock), ec2.Port.tcp(443));



    });
    return securityGroup;
  }

  /**
   * Function to add Application Load Balancer resource to CloudFormation stack.
   * @param props  Properties of the construct.
   * @returns Load Balancer (ELB v2) resource.
   */
  private addLoadBalancer(props: DIHStackProps): elb.CfnLoadBalancer {
    const publicSubnets = this.vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC });
    return new elb.CfnLoadBalancer(this, "DynamicImageHandlerALB", {
      subnets: publicSubnets.subnetIds,
      scheme: props.lbScheme ? props.lbScheme : this.defaultLoadBalancerScheme,
      securityGroups: [this.ALBSecurityGroup.securityGroupId],
    });
  }

  /**
   * Function to add IAM Role resource to CloudFormation stack.
   * @returns Security Group resource.
   */
  private addIAMRole(): iam.Role {
    var iamRole = new iam.Role(this, "EC2IAMRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
    });
    iamRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "secretsmanager:GetSecretValue",
          "kms:Decrypt",
          "kms:Encrypt",
          "kms:ReEncrypt",
          "kms:GenerateDataKey",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListObject",
          "s3:GetBucketLocation",
          "ssm:createResourceDataSync",
          "ssm:listResourceDataSync",
          "ssm:getOpsSummary",
          "ssm:createAssociation",
          "ssm:createDocument",
          "ssm:startAssociationsOnce",
          "ssm:startAutomationExecution",
          "ssm:updateAssociation",
          "ssm:listAssociations",
          "ssm:listDocuments",
          "ssm:getDocument",
          "ssm:describeAssociation",
          "ssm:describeAutomationExecutions",
          "organizations:ListRoots",
          "organizations:DescribeOrganization",
          "organizations:ListOrganizationalUnitsForParent",
          "organizations:EnableAWSServiceAccess",
          "cloudformation:DescribeStacks",
        ],
        resources: ["*"],
      })
    );

    return iamRole;
  }

  /**
   * Function to add a default Target Group resource to CloudFormation stack.
   * @param props  Properties of the construct.
   * @returns Load Balancer Target Group (for root level API) resource.
   */
  private addDefaultTargetGroup(props: DIHStackProps): elb.CfnTargetGroup {
    return new elb.CfnTargetGroup(this, "LBDefaultTargetGroup", {
      healthCheckPath: props.elbHealthCheckPath ? props.elbHealthCheckPath : this.elbTgHealthCheckPath,
      matcher: {
        httpCode: this.matcherHttpCode,
      },
      port: this.defaultLBPort,
      protocol: this.defaultLBProtocol,
      vpcId: this.vpc.vpcId,
    });
  }

  /**
   * Function to add Load Balancer Listener resource to CloudFormation stack.
   * @returns Load Balancer Listener resource.
   */
  private addDefaultListener(): elb.CfnListener {
    return new elb.CfnListener(this, "HTTPDefaultListener", {
      defaultActions: [
        {
          targetGroupArn: this.CfnDefaultALBTargetGroup.ref,
          type: this.defaultListenerActionType,
        },
      ],
      loadBalancerArn: this.CfnLoadBalancer.ref,
      port: this.defaultLBPort,
      protocol: this.defaultLBProtocol,
    });
  }

  /**
   * Function to add default Load Balancer Listener Rule resource to CloudFormation stack.
   * @returns Load Balancer Listener Rule (for root level API) resource.
   */
  private addDefaultListenerRule(): elb.CfnListenerRule {
    return new elb.CfnListenerRule(this, "LBDefaultListenerRule", {
      listenerArn: this.CfnALBDefaultListener.ref,
      priority: 1,
      actions: [
        {
          type: this.defaultListenerActionType,
          targetGroupArn: this.CfnDefaultALBTargetGroup.ref,
        },
      ],
      conditions: [
        {
          field: "path-pattern",
          values: ["*"],
        },
      ],
    });
  }

  /**
   * Function to add AWS Auto Scaling Group resource to CloudFormation stack.
   * @param props  Properties of the construct.
   * @returns AWS Auto Scaling Group resource.
   */
  private addAutoScalingGroup(props: DIHStackProps): asg.CfnAutoScalingGroup {
    const privateSubnets = this.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS });
    return new asg.CfnAutoScalingGroup(this, "AutoScalingGroup", {
      minSize: props.asgMinSize ? props.asgMinSize.toString() : this.defaultASGCapacity.toString(),
      maxSize: props.asgMaxSize ? props.asgMaxSize.toString() : this.defaultASGCapacity.toString(),
      desiredCapacity: props.asgDesiredSize ? props.asgDesiredSize.toString() : this.defaultASGCapacity.toString(),
      launchTemplate: {
        launchTemplateId: this.CfnLaunchTemplate.ref,
        version: this.CfnLaunchTemplate.attrLatestVersionNumber,
      },
      vpcZoneIdentifier: privateSubnets.subnetIds,
      targetGroupArns: [this.CfnDefaultALBTargetGroup.ref],

    });
  }

  /**
   * Function to add Launch Template resource to CloudFormation stack.
   * @param props  Properties of the construct.
   * @returns Launch Template resource.
   */
  private addLaunchTemplate(props: DIHStackProps): ec2.CfnLaunchTemplate {



    let basePath: string = path.join(__dirname, "..");
    let userdataFilePath: string = path.join(basePath, "scripts", "userdata.sh");
    var userdataLoc = props.userdata ? props.userdata : userdataFilePath;
    let userdata = fs.readFileSync(userdataLoc, "utf8");

    const key = new KeyPair(this, "DIH-Key-Pair", {
      name: "cdk-dih-key",
      description: "Key Pair to access the EC2 instance",
      storePublicKey: true, // by default the public key will not be stored in Secrets Manager
    });
    key.grantReadOnPublicKey;

    const instProfileArn = new iam.CfnInstanceProfile(this, "InstanceProfile", { roles: [this.IAMRole.roleName] })

    .attrArn;


    return new ec2.CfnLaunchTemplate(this, "LaunchTemplate", {
      launchTemplateData: {
        instanceType: props.instanceType,

        blockDeviceMappings: [{
          deviceName: '/dev/sdm',
          ebs: {
            encrypted: true,
            deleteOnTermination: true,
            volumeSize: 50,
            volumeType: ec2.EbsDeviceVolumeType.GP3
          }
        }],
        ebsOptimized: true,
        iamInstanceProfile: {
          arn: instProfileArn

        },
        imageId: props.imageId ? props.imageId : ec2.MachineImage.latestAmazonLinux2023().getImage(this).imageId,
        instanceInitiatedShutdownBehavior: "terminate",
        keyName: key.keyPairName,

        monitoring: {
          enabled: true,
        },
        securityGroupIds: [this.EC2SecurityGroup.securityGroupId],
        userData: cdk.Fn.base64(userdata),
      },
    });




  }
  /**
   * Function to add Outputs to CloudFormation stack.
   * @returns
   */
  private addOutputsToCloudFormationTemplate() {
    new cdk.CfnOutput(this, "ApiOutput", {
      value: "http://" + this.CfnLoadBalancer.getAtt("DNSName").toString(),
    });
  }
}
