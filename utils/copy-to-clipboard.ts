export const copyToClipboard = (text: string): void => {
  const result = navigator.clipboard.writeText(text);

  console.log(`Copy result`, result);
}
