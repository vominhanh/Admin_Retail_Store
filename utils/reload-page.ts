export const reloadPage = (): void => {
  const delayBeforeReload = 2000;

  setTimeout(() => {
    location.reload();
  }, delayBeforeReload);
}
