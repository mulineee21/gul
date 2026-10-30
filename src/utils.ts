import { SourceType } from "./types";

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0) return `${bytes} B`;
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getSourceBadgeInfo(source: SourceType): {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
} {
  switch (source) {
    case "pacman":
      return {
        label: "Pacman (Native)",
        bgColor: "bg-amber-950/40",
        textColor: "text-amber-300",
        borderColor: "border-amber-600/30",
      };
    case "flatpak":
      return {
        label: "Flatpak",
        bgColor: "bg-blue-950/40",
        textColor: "text-blue-300",
        borderColor: "border-blue-600/30",
      };
    case "snap":
      return {
        label: "Snap",
        bgColor: "bg-orange-950/40",
        textColor: "text-orange-300",
        borderColor: "border-orange-600/30",
      };
    case "apt":
      return {
        label: "APT (Debian/Ubuntu)",
        bgColor: "bg-purple-950/40",
        textColor: "text-purple-300",
        borderColor: "border-purple-600/30",
      };
    case "dnf":
      return {
        label: "DNF (Fedora/RPM)",
        bgColor: "bg-sky-950/40",
        textColor: "text-sky-300",
        borderColor: "border-sky-600/30",
      };
    case "appimage":
      return {
        label: "AppImage",
        bgColor: "bg-emerald-950/40",
        textColor: "text-emerald-300",
        borderColor: "border-emerald-600/30",
      };
    case "aur":
      return {
        label: "AUR (Arch)",
        bgColor: "bg-fuchsia-950/40",
        textColor: "text-fuchsia-300",
        borderColor: "border-fuchsia-600/30",
      };
    case "portage":
      return {
        label: "Portage (Gentoo)",
        bgColor: "bg-teal-950/40",
        textColor: "text-teal-300",
        borderColor: "border-teal-600/30",
      };
    default:
      return {
        label: source,
        bgColor: "bg-zinc-800",
        textColor: "text-zinc-300",
        borderColor: "border-zinc-700",
      };
  }
}
