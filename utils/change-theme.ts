export const changeTheme = (): void => {
  if (!window.matchMedia)
    return;

  if ( window.matchMedia('(prefers-color-scheme: dark)').matches ) 
    document.documentElement.setAttribute("data-theme", "light");
  else if ( window.matchMedia('(prefers-color-scheme: light)').matches )
    document.documentElement.setAttribute("data-theme", "dark");
}
