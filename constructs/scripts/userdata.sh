#!/bin/bash
sudo su - ec2-user
cd /tmp
sudo yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
sudo  yum -y install git
cd /home/ec2-user
mkdir app
cd app/
git clone https://github.com/aws-samples/dynamic-image-handler-poc.git
cd dynamic-image-handler-poc/
#curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo yum install https://rpm.nodesource.com/pub_20.x/nodistro/repo/nodesource-release-nodistro-1.noarch.rpm -y
sudo yum install nodejs -y --setopt=nodesource-nodejs.module_hotfixes=1
sudo chmod 755 -R /home/ec2-user/app/dynamic-image-handler-poc/
sudo yum -y update
sudo yum install -y nodejs
sudo npm i -g pm2
sudo npm i
sudo npm run build
sudo pm2 start build/server.js

echo "User data execution completed"