// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ImageFormatTypes, RequestTypes } from "./enums";
import { Headers, ImageEdits } from "./types";

export interface ImageRequestInfo {
    requestType: RequestTypes;
    bucket: string;
    key: string;
    edits?: ImageEdits;
    originalImage: Buffer;
    headers?: Headers;
    contentType?: string;
    expires?: string;
    lastModified?: string;
    cacheControl?: string;
    outputFormat?: ImageFormatTypes;
    effort?: number;
  }