import { TASKBAR_HEIGHT_CLASS } from "./desktop-config";
import { cn } from "@/lib/utils/cn";

/**
 * Reserves the strip the taskbar covers, at the very end of the document.
 *
 * The taskbar is `position: fixed`, so without this it sits on top of the last
 * rows of the footer. The alternative — padding `<body>` from JavaScript once
 * the shell mounts — shifts the whole page after hydration, which is visible
 * and worse than an empty div.
 */
export function TaskbarSpacer() {
  return <div aria-hidden="true" className={cn("w-full shrink-0", TASKBAR_HEIGHT_CLASS)} />;
}
