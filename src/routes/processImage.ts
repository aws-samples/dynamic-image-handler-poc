// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import express, { Request, Response } from "express";
import { ImageService } from "../service/imageService";
import { ImageRequestInfo } from "../lib/interfaces";
import { ImageEdits, ImageHandlerError } from "../lib/types";
import { ContentTypes, StatusCodes, ImageFitTypes } from "../lib/enums";

export const processImage = express.Router();

/**
 * Route to process the image and return the image in the specified format.
 *
 */
processImage.get("/image/:bucket/:edits/:key", async (req: Request, res: Response) => {
  const imageService = new ImageService();
  const resizeEdit: ImageEdits = { resize: {} };
  const imageRequestInfo: ImageRequestInfo = <ImageRequestInfo>{};
  const bucket = req.params.bucket;
  const edits = req.params.edits;
  const key = req.params.key;


  imageRequestInfo.bucket = bucket;
  imageRequestInfo.key = key;

  resizeEdit.resize.width = edits != null ? edits.split(new RegExp("X", "i"))[0] : null;
  resizeEdit.resize.height = edits != null ? edits.split(new RegExp("X", "i"))[1] : null;
  resizeEdit.resize.fit = ImageFitTypes.INSIDE;
  imageRequestInfo.edits = resizeEdit;

  const imageBuffer = await imageService.processImage(imageRequestInfo);

  const contentType = inferImageType(imageBuffer);
  //console.info(imageRequestInfo.outputFormat);
  res.contentType(contentType);
  res.status(StatusCodes.OK);
  res.write(imageBuffer);
  res.end();
});

processImage.get("/health", async (req: Request, res: Response) => {
  res.status(StatusCodes.OK);
  res.send("OK");
});

/**
 * Return the output format depending on first four hex values of an image file.
 * @param imageBuffer Image buffer.
 * @returns The output format.
 */
function inferImageType(imageBuffer: Buffer): string {
  const imageSignature = imageBuffer.slice(0, 4).toString("hex").toUpperCase();
  switch (imageSignature) {
    case "89504E47":
      return ContentTypes.PNG;
    case "FFD8FFDB":
    case "FFD8FFE0":
    case "FFD8FFED":
    case "FFD8FFEE":
    case "FFD8FFE1":
      return ContentTypes.JPEG;
    case "52494646":
      return ContentTypes.WEBP;
    case "49492A00":
    case "4D4D002A":
      return ContentTypes.TIFF;
    case "47494638":
      return ContentTypes.GIF;
    default:
      throw new ImageHandlerError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        "RequestTypeError",
        "The file does not have an extension and the file type could not be inferred. Please ensure that your original image is of a supported file type (jpg, png, tiff, webp, svg). Refer to the documentation for additional guidance on forming image requests."
      );
  }
}
