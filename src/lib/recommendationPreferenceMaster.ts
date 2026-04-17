export type RecommendationPreferenceOption = {
  id: string;
  label: string;
  description?: string;
};

export const RECOMMENDATION_CONTENT_FILTER_MASTER: RecommendationPreferenceOption[] = [
  {
    id: 'graphic-violence',
    label: '過度な暴力表現',
    description: '流血や強い暴力描写を含む作品です。',
  },
  {
    id: 'horror',
    label: 'ホラー描写',
    description: '恐怖や心霊、ショッキングな演出を含む作品です。',
  },
  {
    id: 'sexual-content',
    label: '性的表現',
    description: '成人向けの性的な描写を含む作品です。',
  },
  {
    id: 'gambling',
    label: 'ギャンブル',
    description: '賭博や射幸心を強くあおる描写を含む作品です。',
  },
  {
    id: 'substance-use',
    label: '飲酒・喫煙・薬物',
    description: '飲酒、喫煙、薬物使用の描写を含む作品です。',
  },
  {
    id: 'disturbing-themes',
    label: '刺激の強いテーマ',
    description: '虐待や差別、自傷など重いテーマを含む作品です。',
  },
];

export const RECOMMENDATION_GENRE_MASTER: RecommendationPreferenceOption[] =
  RECOMMENDATION_CONTENT_FILTER_MASTER.map((option) => ({ ...option }));

const RECOMMENDATION_GENRE_LABEL_MAP = new Map(
  RECOMMENDATION_GENRE_MASTER.map((option) => [option.id, option.label]),
);

export function getRecommendationGenreLabels(
  genreIds: string[] | null | undefined,
  count = 3,
) {
  const selectedLabels = Array.from(
    new Set(
      (genreIds ?? [])
        .map((genreId) => RECOMMENDATION_GENRE_LABEL_MAP.get(genreId))
        .filter((label): label is string => typeof label === 'string' && label.length > 0),
    ),
  );

  const fallbackLabels = RECOMMENDATION_GENRE_MASTER
    .map((option) => option.label)
    .filter((label) => !selectedLabels.includes(label));

  return [...selectedLabels, ...fallbackLabels].slice(0, count);
}
