import { t } from "./i18n";

export function render() {
  const heading = t("home.title");
  const empty = t("orders.empty");
  const button = "Save changes";
  return { heading, empty, button };
}
