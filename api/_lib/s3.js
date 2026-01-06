
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';

// MOCK FOR LOCAL DEV
const isMock = !process.env.MY_AWS_ACCESS_KEY_ID;
const MOCK_DIR = '/tmp/mock-s3';

if (isMock) {
    if (!fs.existsSync(MOCK_DIR)) fs.mkdirSync(MOCK_DIR, { recursive: true });
    console.log("Using MOCKED S3 (Local Filesystem)");
}

const s3Client = !isMock ? new S3Client({
    region: process.env.MY_AWS_REGION,
    credentials: {
        accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
    }
}) : null;

const BUCKET_NAME = process.env.MY_AWS_BUCKET_NAME || 'mock-bucket';

// Generate Presigned Upload URL
export const getUploadUrl = async (key, contentType) => {
    if (isMock) {
        return `http://localhost:3000/mock-s3/${encodeURIComponent(key)}`;
    }
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 900 });
};

// Generate Presigned Download URL
export const getDownloadUrl = async (key) => {
    if (isMock) {
        return `http://localhost:3000/mock-s3/${encodeURIComponent(key)}`;
    }
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

// Helper: Download S3 Object to Buffer
export const downloadToBuffer = async (key) => {
    if (isMock) {
        const filePath = path.join(MOCK_DIR, key);
        return fs.promises.readFile(filePath);
    }
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    const response = await s3Client.send(command);

    const stream = response.Body;
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};

// Helper: Upload Buffer to S3
export const uploadBuffer = async (key, buffer, contentType) => {
    if (isMock) {
        const filePath = path.join(MOCK_DIR, key);
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        await fs.promises.writeFile(filePath, buffer);
        console.log(`[MockS3] Saved ${key} to ${filePath}`);
        return;
    }
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });
    await s3Client.send(command);
};
