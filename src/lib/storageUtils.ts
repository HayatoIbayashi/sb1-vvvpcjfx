import { Amplify } from "aws-amplify";
import { getUrl } from '@aws-amplify/storage';
import amplifyConfig from '../../amplify_outputs.json';

Amplify.configure(amplifyConfig);

/**
 * Amplify Storageからファイルの署名付きURLを取得
 */

export const linkToStorageFile = async (path: string): Promise<string> => {
  try {
    const { url } = await getUrl({ path });
    return url.href;
  } catch (err) {
    console.error('Storage Error:', err);
    throw err;
  }
};