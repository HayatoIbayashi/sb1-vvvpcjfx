import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import type { UpsertUserAndProfileReq, UpsertUserAndProfileRes } from './types.js';

const REGION = process.env.AWS_REGION || process.env.COGNITO_REGION || 'ap-northeast-1';
const DB_UPSERT_LAMBDA_NAME = process.env.DB_UPSERT_LAMBDA_NAME;

const lambda = new LambdaClient({ region: REGION });

function decodePayload(payload?: Uint8Array) {
  if (!payload || !payload.length) return null;
  try {
    return JSON.parse(Buffer.from(payload).toString('utf-8')) as UpsertUserAndProfileRes;
  } catch {
    return null;
  }
}

export async function invokeDbUpsert(payload: UpsertUserAndProfileReq) {
  if (!DB_UPSERT_LAMBDA_NAME) {
    throw new Error('Missing env: DB_UPSERT_LAMBDA_NAME');
  }

  const result = await lambda.send(new InvokeCommand({
    FunctionName: DB_UPSERT_LAMBDA_NAME,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify(payload)),
  }));

  if (result.FunctionError) {
    const functionPayload = decodePayload(result.Payload);
    throw new Error(
      functionPayload && 'message' in functionPayload && typeof functionPayload.message === 'string'
        ? functionPayload.message
        : result.FunctionError,
    );
  }

  const body = decodePayload(result.Payload);
  if (!body) {
    throw new Error('DB upsert Lambda returned an empty response');
  }
  if (!body.ok) {
    throw new Error(body.message);
  }
}
