// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdirSync } from "fs";
import { Logger } from "winston";
import winston = require("winston");

const logDir = "./logs";

if (!existsSync(logDir)) {
  mkdirSync(logDir);
}

const logger: Logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: `${logDir}/app.log` }),
  ],
});

export default logger;
