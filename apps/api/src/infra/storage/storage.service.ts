import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Client as MinioClient } from 'minio';

@Injectable()
export class StorageService {
  private readonly bucket = process.env.MINIO_BUCKET ?? 'zupu-source';
  private readonly client: MinioClient;

  constructor() {
    this.client = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
      port: Number(process.env.MINIO_PORT ?? '9000'),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
    });
  }

  async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async upload(buffer: Buffer, objectKey: string, mimeType: string) {
    try {
      await this.ensureBucket();
      await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, {
        'Content-Type': mimeType,
      });
      return { bucket: this.bucket, objectKey };
    } catch (error) {
      throw new InternalServerErrorException(`上传失败: ${(error as Error).message}`);
    }
  }

  async getPresignedUrl(objectKey: string, expirySeconds = 900) {
    await this.ensureBucket();
    return this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
  }

  async getObjectBuffer(objectKey: string): Promise<Buffer> {
    await this.ensureBucket();
    const stream = await this.client.getObject(this.bucket, objectKey);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
