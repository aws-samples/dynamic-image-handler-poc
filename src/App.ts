// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import cors from "cors";
import express from "express";
import http from "http";
import helmet from "helmet";
import bodyParser from "body-parser";
import dotenv from "dotenv";

import { routes } from "./routes";

export default class App {
  public express: express.Application;

  public httpServer: http.Server;

  public async init(): Promise<void> {
    this.express = express();
    this.httpServer = http.createServer(this.express);

    // add all global middleware like cors
    this.middleware();

    // // register the all c
    this.express.use(routes);

    // add the middleware to handle error, make sure to add if after registering routes method
    //this.express.use(addErrorHandler);
    this.express.use(bodyParser.json({ limit: "50mb", type: "application/json" }));
    this.express.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
    dotenv.config();
  }

  /**
   * here you can apply your middlewares
   */
  private middleware(): void {
    // support application/json type post data
    // support application/x-www-form-urlencoded post data
    // Helmet can help protect your app from some well-known web vulnerabilities by setting HTTP headers appropriately.
    this.express.use(helmet({ contentSecurityPolicy: false }));
    this.express.use(express.json());
    this.express.use(express.urlencoded());

    this.express.use(cors());
  }

  private parseRequestHeader(req: express.Request, res: express.Response, next: Function): void {
    next();
  }
}
