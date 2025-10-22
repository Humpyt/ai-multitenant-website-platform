import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

interface DownloadResult {
  success: boolean;
  data?: string;
  error?: string;
}

interface DeleteResult {
  success: boolean;
  error?: string;
}

export class S3Wrapper {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.bucketName = process.env.AWS_S3_BUCKET_NAME!;
  }

  async uploadFile(
    key: string,
    content: string,
    contentType: string = 'text/plain'
  ): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: content,
        ContentType: contentType,
        // Make files publicly readable (adjust based on your security requirements)
        ACL: 'public-read',
      });

      await this.client.send(command);

      const url = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      return {
        success: true,
        url,
        key,
      };
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async uploadWebsiteFiles(
    tenantId: string,
    website: {
      html: string;
      css: string;
      js: string;
    }
  ): Promise<{
    html: UploadResult;
    css: UploadResult;
    js: UploadResult;
    success: boolean;
  }> {
    const baseKey = `websites/${tenantId}`;
    const timestamp = Date.now();

    const [htmlResult, cssResult, jsResult] = await Promise.all([
      this.uploadFile(`${baseKey}/index.html`, website.html, 'text/html'),
      this.uploadFile(`${baseKey}/styles.css`, website.css, 'text/css'),
      this.uploadFile(`${baseKey}/script.js`, website.js, 'application/javascript'),
    ]);

    const overallSuccess = htmlResult.success && cssResult.success && jsResult.success;

    return {
      html: htmlResult,
      css: cssResult,
      js: jsResult,
      success: overallSuccess,
    };
  }

  async getFile(key: string): Promise<DownloadResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      if (response.Body) {
        const data = await response.Body.transformToString();
        return {
          success: true,
          data,
        };
      } else {
        return {
          success: false,
          error: 'File body is empty',
        };
      }
    } catch (error) {
      console.error('Error getting file from S3:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getWebsiteFiles(tenantId: string): Promise<{
    html?: DownloadResult;
    css?: DownloadResult;
    js?: DownloadResult;
    success: boolean;
  }> {
    const baseKey = `websites/${tenantId}`;

    const [htmlResult, cssResult, jsResult] = await Promise.all([
      this.getFile(`${baseKey}/index.html`),
      this.getFile(`${baseKey}/styles.css`),
      this.getFile(`${baseKey}/script.js`),
    ]);

    return {
      html: htmlResult,
      css: cssResult,
      js: jsResult,
      success: htmlResult.success || cssResult.success || jsResult.success,
    };
  }

  async deleteFile(key: string): Promise<DeleteResult> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async deleteWebsiteFiles(tenantId: string): Promise<DeleteResult> {
    try {
      const baseKey = `websites/${tenantId}`;

      // First, list all objects in the website folder
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: baseKey,
      });

      const listResponse = await this.client.send(listCommand);

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        // Delete all objects in the folder
        const deletePromises = listResponse.Contents.map(object => {
          if (object.Key) {
            return this.deleteFile(object.Key);
          }
          return Promise.resolve({ success: true });
        });

        const results = await Promise.all(deletePromises);
        const allSuccessful = results.every(result => result.success);

        return {
          success: allSuccessful,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting website files from S3:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw error;
    }
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  getWebsitePublicUrls(tenantId: string): {
    html: string;
    css: string;
    js: string;
  } {
    const baseKey = `websites/${tenantId}`;

    return {
      html: this.getPublicUrl(`${baseKey}/index.html`),
      css: this.getPublicUrl(`${baseKey}/styles.css`),
      js: this.getPublicUrl(`${baseKey}/script.js`),
    };
  }
}

// Singleton instance
export const s3Wrapper = new S3Wrapper();

// Helper functions for website operations
export const uploadWebsiteToS3 = async (tenantId: string, website: {
  html: string;
  css: string;
  js: string;
}) => {
  return s3Wrapper.uploadWebsiteFiles(tenantId, website);
};

export const getWebsiteFromS3 = async (tenantId: string) => {
  return s3Wrapper.getWebsiteFiles(tenantId);
};

export const deleteWebsiteFromS3 = async (tenantId: string) => {
  return s3Wrapper.deleteWebsiteFiles(tenantId);
};

export const getWebsiteUrls = (tenantId: string) => {
  return s3Wrapper.getWebsitePublicUrls(tenantId);
};