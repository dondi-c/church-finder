export async function fetchWithError(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }
  
  return response;
}
