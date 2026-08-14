export const changeTheme = (): void => {
  const root: HTMLElement = document.documentElement;
  const isDark: boolean = root.getAttribute("data-theme") === "dark";

  root.setAttribute("data-theme", isDark ? "light" : "dark");
}
