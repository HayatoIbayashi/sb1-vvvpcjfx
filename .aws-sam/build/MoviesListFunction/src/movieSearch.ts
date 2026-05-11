export function buildMovieSearchClause(isAdmin: boolean) {
  const fields = isAdmin
    ? [
        "COALESCE(title, '')",
        "COALESCE(description, '')",
        "COALESCE(array_to_string(genre, ' '), '')",
        "COALESCE(array_to_string(\"cast\", ' '), '')",
      ]
    : [
        "COALESCE(title, '')",
        "COALESCE(description, '')",
        "COALESCE(array_to_string(\"cast\", ' '), '')",
      ];

  return fields.map((field) => `${field} ILIKE $1`).join(' OR ');
}
