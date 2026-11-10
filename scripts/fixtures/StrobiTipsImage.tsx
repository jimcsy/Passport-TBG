import type { ImgHTMLAttributes } from "react";
/** Harness-only adapter: real public assets, same dimensions/alt, no Next server. */
export default function HarnessImage(props: ImgHTMLAttributes<HTMLImageElement>) { return <img {...props} />; }
