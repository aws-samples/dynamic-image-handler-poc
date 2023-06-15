#!/bin/bash
sudo su - ec2-user
cd /home/ec2-user
sudo  yum -y install git
mkdir app
cd app/
git clone https://github.com/aws-samples/dynamic-image-handler-poc.git
cd dynamic-image-handler-poc/
curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash -
sudo chmod 755 -R /home/ec2-user/app/dynamic-image-handler-poc/
sudo yum -y update
sudo yum install -y nodejs
sudo npm i -g pm2
sudo npm i
sudo npm run build
sudo pm2 start build/server.js

echo "User data execution completed"