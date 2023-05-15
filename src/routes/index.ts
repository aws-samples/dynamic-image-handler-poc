// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import express from "express";
import { processImage } from "./processImage";
import { defaultRoute } from "./defaultRoute";

export const routes = express.Router();

routes.use(processImage);
routes.use(defaultRoute);
