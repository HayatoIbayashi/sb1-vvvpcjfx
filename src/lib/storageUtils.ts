import { Amplify, Storage } from 'aws-amplify';
import amplifyConfig from '../../amplify_outputs.json';

Amplify.configure(amplifyConfig);

/**
 * Amplify Storageからファイルの署名付きURLを取得
 * @param path - ストレージ内のファイルパス
 * @param expiresIn - URLの有効期間(秒)
 * @returns 署名付きURL
 */
export const linkToStorageFile = async (
  path: string, 
  expiresIn: number = 3600
): Promise<string> => {
  try {
    const url = await Storage.get(path, { expiresIn });
    return url.toString();
  } catch (error) {
    console.error('Failed to get storage URL:', error);
    throw new Error('ファイルの取得に失敗しました');
  }
};
