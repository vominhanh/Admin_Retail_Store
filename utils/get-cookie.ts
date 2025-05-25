export const getCookie = (key: string): string | undefined => {
  if (typeof document === 'undefined') return undefined;
  const results: RegExpMatchArray | null =
    document.cookie.match("(^|;)\\s*" + key + "\\s*=\\s*([^;]+)");

  if (!results)
    return undefined;

  return results.pop();
}
