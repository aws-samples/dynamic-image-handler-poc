// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import sharp, { FormatEnum } from "sharp";

import {
  ContentTypes,
  StatusCodes,
  ImageFitTypes,
  ImageFormatTypes,
} from "../lib/enums";
import { ImageHandlerError, ImageEdits } from "../lib/types";
import { ImageRequestInfo } from "../lib/interfaces";
import S3 from "aws-sdk/clients/s3";

const s3Client = new S3();

type OriginalImageInfo = Partial<{
  contentType: string;
  expires: string;
  lastModified: string;
  cacheControl: string;
  originalImage: Buffer;
}>;

export class ImageService {
  public async processImage(
    imageRequestInfo: ImageRequestInfo
  ): Promise<Buffer> {
    try {
      return await this.setup(imageRequestInfo);
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Initializer function for creating a new image request, used by the image handler to perform image modifications.
   * @param event Lambda request body.
   * @returns Initialized image request information.
   */
  private async setup(imageRequestInfo: ImageRequestInfo): Promise<Buffer> {
    try {
      const originalImage = await this.getOriginalImage(
        imageRequestInfo.bucket,
        imageRequestInfo.key
      );

      imageRequestInfo = { ...imageRequestInfo, ...originalImage };

      // If the original image is SVG file and it has any edits but no output format, change the format to PNG.
      if (
        imageRequestInfo.contentType === ContentTypes.SVG &&
        imageRequestInfo.edits &&
        Object.keys(imageRequestInfo.edits).length > 0 &&
        !imageRequestInfo.edits.toFormat
      ) {
        imageRequestInfo.outputFormat = ImageFormatTypes.PNG;
      }

      const processedRequest = await this.process(imageRequestInfo);

      return processedRequest;
    } catch (error) {
      console.error(error);

      throw error;
    }
  }

  /**
   * Creates a Sharp object from Buffer
   * @param originalImage An image buffer.
   * @param edits The edits to be applied to an image
   * @param options Additional sharp options to be applied
   * @returns A Sharp image object
   */
  // eslint-disable-next-line @typescript-eslint/ban-types
  private async instantiateSharpImage(
    originalImage: Buffer,
    options: NonNullable<unknown>
  ): Promise<sharp.Sharp> {
    const image: sharp.Sharp = sharp(originalImage, options);
    return image;
  }

  /**
   * Main method for processing image requests and outputting modified images.
   * @param imageRequestInfo An image request.
   * @returns Processed and modified image encoded as base64 string.
   */
  async process(imageRequestInfo: ImageRequestInfo): Promise<Buffer> {
    console.log(imageRequestInfo);
    const { originalImage, edits } = imageRequestInfo;

    const options = {
      failOnError: false,
      limitInputPixels: false,
      animated: imageRequestInfo.contentType === ContentTypes.GIF,
    };

    let modifiedImage;
    // Apply edits if specified
    if (edits && Object.keys(edits).length) {
      // convert image to Sharp object
      const image = await this.instantiateSharpImage(originalImage, options);

      modifiedImage = await this.applyEdits(image, edits);

      // modify image output if requested
      modifiedImage = this.modifyImageOutput(modifiedImage, imageRequestInfo);

      // Uncomment below line if you want to write the output image to S3
      /*
            console.log("Write to S3");
            const params = {
                Bucket: "mb-modified-images",
                Key: imageRequestInfo.key,
                Body: await modifiedImage.toBuffer()
    
            };
            await s3Client.putObject(params).promise();
            */
    }

    return modifiedImage.toBuffer();
  }

  /**
   * Applies image modifications to the original image based on edits.
   * @param originalImage The original sharp image.
   * @param edits The edits to be made to the original image.
   * @param isAnimation a flag whether the edit applies to `gif` file or not.
   * @returns A modifications to the original image.
   */
  public async applyEdits(
    originalImage: sharp.Sharp,
    edits: ImageEdits
  ): Promise<sharp.Sharp> {
    await this.applyResize(originalImage, edits);

    // Apply the image edits

    for (const edit in edits) {
      //console.log(edit);
      if (edit == "resize") {
        if (edit in originalImage) {
          originalImage[edit](edits[edit]);
        }
      }
    }
    return originalImage;
  }

  /**
   * Applies resize edit.
   * @param originalImage The original sharp image.
   * @param edits The edits to be made to the original image.
   */
  private async applyResize(
    originalImage: sharp.Sharp,
    edits: ImageEdits
  ): Promise<void> {
    if (edits.resize === undefined) {
      edits.resize = {};
      edits.resize.fit = ImageFitTypes.INSIDE;
    } else {
      if (edits.resize.width)
        edits.resize.width = Math.round(Number(edits.resize.width));
      if (edits.resize.height)
        edits.resize.height = Math.round(Number(edits.resize.height));

      if (edits.resize.ratio) {
        const ratio = edits.resize.ratio;

        const { width, height } =
          edits.resize.width && edits.resize.height
            ? edits.resize
            : await originalImage.metadata();

        edits.resize.width = Math.round(width * ratio);
        edits.resize.height = Math.round(height * ratio);
        // Sharp doesn't have such parameter for resize(), we got it from Thumbor mapper.  We don't need to keep this field in the `resize` object
        delete edits.resize.ratio;

        if (!edits.resize.fit) edits.resize.fit = ImageFitTypes.INSIDE;
      }
    }
  }

  /**
   * Modify an image's output format if specified
   * @param modifiedImage the image object.
   * @param imageRequestInfo the image request
   * @returns A Sharp image object
   */
  private modifyImageOutput(
    modifiedImage: sharp.Sharp,
    imageRequestInfo: ImageRequestInfo
  ): sharp.Sharp {
    const modifiedOutputImage = modifiedImage;

    // modify if specified
    if (imageRequestInfo.outputFormat !== undefined) {
      // Include reduction effort for webp images if included
      if (
        imageRequestInfo.outputFormat === ImageFormatTypes.WEBP &&
        typeof imageRequestInfo.effort !== "undefined"
      ) {
        modifiedOutputImage.webp({ effort: imageRequestInfo.effort });
      } else {
        modifiedOutputImage.toFormat(
          ImageService.convertImageFormatType(imageRequestInfo.outputFormat)
        );
      }
    }

    return modifiedOutputImage;
  }

  /**
   * Converts serverless image handler image format type to 'sharp' format.
   * @param imageFormatType Result output file type.
   * @returns Converted 'sharp' format.
   */
  private static convertImageFormatType(
    imageFormatType: ImageFormatTypes
  ): keyof FormatEnum {
    switch (imageFormatType) {
      case ImageFormatTypes.JPG:
        return "jpg";
      case ImageFormatTypes.JPEG:
        return "jpeg";
      case ImageFormatTypes.PNG:
        return "png";
      case ImageFormatTypes.WEBP:
        return "webp";
      case ImageFormatTypes.TIFF:
        return "tiff";
      case ImageFormatTypes.HEIF:
        return "heif";
      case ImageFormatTypes.RAW:
        return "raw";
      case ImageFormatTypes.GIF:
        return "gif";
      default:
        throw new ImageHandlerError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "UnsupportedOutputImageFormatException",
          `Format to ${imageFormatType} not supported`
        );
    }
  }

  /**
   * Gets the original image from an Amazon S3 bucket.
   * @param bucket The name of the bucket containing the image.
   * @param key The key name corresponding to the image.
   * @returns The original image or an error.
   */
  public async getOriginalImage(
    bucket: string,
    key: string
  ): Promise<OriginalImageInfo> {
    try {
      const result: OriginalImageInfo = {};

      const imageLocation = { Bucket: bucket, Key: key };

      const originalImage = await s3Client.getObject(imageLocation).promise();

      const imageBuffer = Buffer.from(originalImage.Body as Uint8Array);

      if (originalImage.ContentType) {
        // If using default S3 ContentType infer from hex headers
        if (
          ["binary/octet-stream", "application/octet-stream"].includes(
            originalImage.ContentType
          )
        ) {
          result.contentType = this.inferImageType(imageBuffer);
        } else {
          result.contentType = originalImage.ContentType;
        }
      } else {
        result.contentType = "image";
      }

      if (originalImage.Expires) {
        result.expires = new Date(originalImage.Expires).toUTCString();
      }

      if (originalImage.LastModified) {
        result.lastModified = new Date(
          originalImage.LastModified
        ).toUTCString();
      }

      result.cacheControl =
        originalImage.CacheControl ?? "max-age=31536000,public";
      result.originalImage = imageBuffer;

      return result;
    } catch (error) {
      let status = StatusCodes.INTERNAL_SERVER_ERROR;
      let message = error.message;
      if (error.code === "NoSuchKey") {
        status = StatusCodes.NOT_FOUND;
        message = `The image ${key} does not exist or the request may not be base64 encoded properly.`;
      }
      throw new ImageHandlerError(status, error.code, message);
    }
  }

  /**
   * Return the output format depending on first four hex values of an image file.
   * @param imageBuffer Image buffer.
   * @returns The output format.
   */
  public inferImageType(imageBuffer: Buffer): string {
    const imageSignature = imageBuffer
      .slice(0, 4)
      .toString("hex")
      .toUpperCase();
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
}
