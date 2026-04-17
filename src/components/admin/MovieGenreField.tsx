import { getAvailableMovieGenres, toggleMovieGenre } from '../../lib/movieGenres';

type MovieGenreFieldProps = {
  selectedGenres: string[];
  onChange: (genres: string[]) => void;
};

export default function MovieGenreField({ selectedGenres, onChange }: MovieGenreFieldProps) {
  const options = getAvailableMovieGenres(selectedGenres);

  return (
    <fieldset>
      <legend className="mb-2 block text-gray-300">ジャンル</legend>
      <p className="mb-3 text-sm text-gray-400">
        アカウント設定と同じジャンルマスターから選択します。既存の動画に入っている値もそのまま保持できます。
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((genre) => {
          const isChecked = selectedGenres.includes(genre);

          return (
            <label
              key={genre}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition ${
                isChecked
                  ? 'border-cyan-400/60 bg-cyan-500/10 text-cyan-50'
                  : 'border-gray-700 bg-gray-900/60 text-gray-200 hover:border-gray-500'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-900 text-cyan-400"
                aria-label={`ジャンル:${genre}`}
                checked={isChecked}
                onChange={() => onChange(toggleMovieGenre(selectedGenres, genre))}
              />
              <span>{genre}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
