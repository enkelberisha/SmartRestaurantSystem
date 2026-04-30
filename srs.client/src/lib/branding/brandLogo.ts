import darkModeLogo from "@/assets/dark-mode-logo.png";
import lightModeLogo from "@/assets/light-mode-logo.png";

export type BrandTheme = "light" | "dark";

export function getBrandLogo(theme: BrandTheme) {
    return theme === "dark" ? darkModeLogo : lightModeLogo;
}
