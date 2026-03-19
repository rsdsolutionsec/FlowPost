import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export default async function handler(req: any, res: any) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ error: 'File name and content type are required.' });
    }

    // Trim variables as they might have been pasted with spaces into Vercel/env
    const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
    const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
    const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
    const bucketName = (process.env.R2_BUCKET_NAME || '').trim();

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
       console.error('Missing R2 configuration', { accountId: !!accountId, accessKeyId: !!accessKeyId, secretAccessKey: !!secretAccessKey, bucketName: !!bucketName });
       return res.status(500).json({ error: 'R2 storage is not properly configured on the server.' });
    }
    
    // Ensure endpoint is a valid URL
    let endpoint = accountId;
    if (!endpoint.startsWith('http')) {
        endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    }
    if (endpoint.endsWith('/')) {
        endpoint = endpoint.slice(0, -1);
    }
    
    const S3 = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
      // IMPORTANT: Cloudflare R2 + Preflight often fails if checksums are injected by the SDK.
      // We disable them here to keep the request simple.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      ContentType: contentType,
      // Also explicitly disable for this command
      ChecksumAlgorithm: undefined,
    });

    const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
    
    let publicUrlBase = (process.env.VITE_R2_PUBLIC_URL || '').trim();
    if (publicUrlBase.endsWith('/')) {
        publicUrlBase = publicUrlBase.slice(0, -1);
    }
    const publicUrl = `${publicUrlBase}/${filename}`;

    return res.status(200).json({ url: signedUrl, publicUrl });
  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    return res.status(500).json({ 
        error: 'Failed to generate signed URL', 
        details: error.message,
        path: req.body.filename 
    });
  }
}
