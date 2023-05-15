// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Router } from "express";

export const defaultRoute = Router();

defaultRoute.get("/", (req, res) => {
  res.send("App working!");
});
