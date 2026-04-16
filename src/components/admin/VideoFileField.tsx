import { useState } from 'react';

type VideoFileFieldProps = {
  inputId: string;
  isEditMode: boolean;
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
};

export default function VideoFileField({
  inputId,
  isEditMode,
  selectedFile,
  onSelectFile,
}: VideoFileFieldProps) {
  const [inputKey, setInputKey] = useState(0);

  const clearSelection = () => {
    onSelectFile(null);
    setInputKey((current) => current + 1);
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label htmlFor={inputId} className="block text-gray-300">
            MP4ファイル
          </label>
          <p className="mt-1 text-sm text-gray-400">
            Elemental 連携前のため、今は選択 UI のみです。保存しても実際のアップロードは実行されません。
          </p>
        </div>
        {selectedFile && (
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-md border border-gray-600 px-3 py-1 text-sm text-gray-300 transition hover:border-gray-500 hover:text-white"
          >
            選択をクリア
          </button>
        )}
      </div>

      {isEditMode && (
        <div className="mt-3 rounded-md bg-gray-800 px-3 py-2 text-sm text-gray-300">
          現在のファイル名は未連携のため取得できません。ここで選択した MP4 は既存ファイルの置き換え予定として扱われます。
        </div>
      )}

      <input
        key={inputKey}
        id={inputId}
        type="file"
        accept="video/mp4"
        onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
        className="mt-4 block w-full text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:font-medium file:text-white hover:file:bg-primary/90"
      />

      <p className="mt-3 text-sm text-gray-300">
        {selectedFile
          ? `選択中のMP4: ${selectedFile.name}`
          : isEditMode
            ? '置き換え用の MP4 は未選択です。'
            : 'アップロードする MP4 は未選択です。'}
      </p>
    </div>
  );
}
