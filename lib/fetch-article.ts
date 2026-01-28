export async function fetchArticle(articleUrl: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${articleUrl}`;

  const response = await fetch(jinaUrl, {
    headers: {
      Authorization: `Bearer ${process.env.JINA_API_KEY}`,
      Accept: "text/plain",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch article: ${response.status} ${response.statusText}`);
  }

  const articleText = await response.text();

  if (!articleText || articleText.trim().length === 0) {
    throw new Error("No content found at the provided URL");
  }

  return articleText;
}
