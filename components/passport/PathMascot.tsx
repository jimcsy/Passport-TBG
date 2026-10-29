import Image from "next/image";
import { STROBI_MASCOT_MAP } from "@/lib/constants/mascots";

export function PathMascot({ path }: { path?: string }) {
  const mascot = path ? STROBI_MASCOT_MAP[path] : undefined;
  if (!mascot) return null;

  return (
    <figure className="my-5 flex flex-col items-center gap-2 text-center sm:my-6">
      <Image
        src={mascot.imagePath}
        alt={mascot.variantTitle}
        width={144}
        height={144}
        className="h-28 w-28 object-contain sm:h-36 sm:w-36"
      />
      <figcaption className="text-xs font-semibold text-beat-maroon">{mascot.variantTitle}</figcaption>
    </figure>
  );
}
