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

    const accountIdEndpoint = process.env.R2_ACCOUNT_ID;
    
    // Some AWS SDKs require the endpoint to end without trailing slashes
    let endpoint = accountIdEndpoint || '';
    if (endpoint.endsWith('/')) {
        endpoint = endpoint.slice(0, -1);
    }
    
    const S3 = new S3Client({
      region: 'auto',
      endpoint: endpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: filename,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(S3, command, { expiresIn: 3600 });
    
    // We clean up public URL as well
    let publicUrlBase = process.env.VITE_R2_PUBLIC_URL || '';
    if (publicUrlBase.endsWith('/')) {
        publicUrlBase = publicUrlBase.slice(0, -1);
    }
    const publicUrl = `${publicUrlBase}/${filename}`;

    return res.status(200).json({ url: signedUrl, publicUrl });
  } catch (error: any) {
    console.error('Error generating presigned URL', error);
    return res.status(500).json({ error: 'Failed to generate URL', details: error.message });
  }
}
