import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// 尝试导入 minio，如果不可用则使用本地文件存储
let MinioClient: any;
try {
  MinioClient = require('minio').Client;
} catch {
  MinioClient = null;
}

@Injectable()
export class StorageService {
  private readonly bucket = process.env.MINIO_BUCKET ?? 'zupu-source';
  private readonly client: any;
  private readonly useLocalStorage: boolean;
  private readonly localStoragePath: string;

  constructor() {
    this.useLocalStorage = process.env.USE_LOCAL_STORAGE === 'true' || !MinioClient;
    this.localStoragePath = process.env.LOCAL_STORAGE_PATH ?? './storage';

    if (!this.useLocalStorage && MinioClient) {
      this.client = new MinioClient({
        endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
        port: Number(process.env.MINIO_PORT ?? '9000'),
        useSSL: false,
        accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
      });
    }
  }

  async ensureBucket() {
    if (this.useLocalStorage) {
      const dir = path.join(this.localStoragePath, this.bucket);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return;
    }
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async upload(buffer: Buffer, objectKey: string, mimeType: string) {
    try {
      await this.ensureBucket();

      if (this.useLocalStorage) {
        const filePath = path.join(this.localStoragePath, this.bucket, objectKey);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, buffer);
        return { bucket: this.bucket, objectKey };
      }

      await this.client.putObject(this.bucket, objectKey, buffer, buffer.length, {
        'Content-Type': mimeType,
      });
      return { bucket: this.bucket, objectKey };
    } catch (error) {
      throw new InternalServerErrorException(`上传失败: ${(error as Error).message}`);
    }
  }

  async getPresignedUrl(objectKey: string, expirySeconds = 900) {
    if (this.useLocalStorage) {
      // 本地存储模式下返回文件路径（开发环境用）
      return `file://${path.resolve(this.localStoragePath, this.bucket, objectKey)}`;
    }
    await this.ensureBucket();
    return this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
  }

  async getObjectBuffer(objectKey: string): Promise<Buffer> {
    if (this.useLocalStorage) {
      const filePath = path.join(this.localStoragePath, this.bucket, objectKey);
      return fs.readFileSync(filePath);
    }
    await this.ensureBucket();
    const stream = await this.client.getObject(this.bucket, objectKey);
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
