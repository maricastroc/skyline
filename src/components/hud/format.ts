export const fmt = (n: number) => Math.round(n).toLocaleString("en");

export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

export const ROLE_LABEL: Record<string, string> = {
  root: "terrain",
  header: "gateway",
  nav: "arcade",
  main: "central district",
  footer: "back terrace",
  aside: "side district",
  section: "block",
  article: "lot",
  form: "installation",
  list: "row houses",
  table: "grid block",
  container: "plinth",
  item: "unit",
  heading: "tower",
  text: "building",
  image: "billboard",
  media: "screen",
  link: "lamp post",
  button: "beacon",
  control: "pylon",
  cluster: "housing estate",
  inline: "building",
  icon: "ornament",
};
