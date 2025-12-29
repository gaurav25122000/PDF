
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from 'stream';



const s3Client = new S3Client({
    region: process.env.MY_AWS_REGION,
    credentials: {
        accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
    }
});

const BUCKET_NAME = process.env.MY_AWS_BUCKET_NAME;

// Generate Presigned Upload URL (Frontend uploads directly here)
export const getUploadUrl = async (key, contentType) => {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });
    // Valid for 15 minutes
    return await getSignedUrl(s3Client, command, { expiresIn: 900 });
};

// Generate Presigned Download URL (Frontend downloads result from here)
export const getDownloadUrl = async (key) => {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    // Valid for 1 hour
    return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

// Helper: Download S3 Object to Buffer (For backend processing)
export const downloadToBuffer = async (key) => {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    const response = await s3Client.send(command);
    
    // Convert stream to buffer
    const stream = response.Body;
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};

// Helper: Upload Buffer to S3 (Save processed result)
export const uploadBuffer = async (key, buffer, contentType) => {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });
    await s3Client.send(command);
};
