import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'File key is required.' });
    }

    const accountIdEndpoint = process.env.R2_ACCOUNT_ID;
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

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    await S3.send(command);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error deleting file', error);
    return res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
}
