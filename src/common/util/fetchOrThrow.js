export default async (input, init) => {
  const response = await fetch(input, init);
  if (!response.ok) {
    const body = await response.text();
    const error = new Error(
      `${response.status} ${response.statusText}: ${body}`,
    );
    error.status = response.status;
    error.statusText = response.statusText;
    error.body = body;
    error.url = typeof input === "string" ? input : input.url;
    error.method = init?.method || "GET";
    throw error;
  }
  return response;
};
