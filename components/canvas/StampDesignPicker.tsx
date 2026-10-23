"use client";
import { STAMP_DESIGNS, type StampDesignKey } from "@/lib/stamps/catalog";
import { PassportStampSVG } from "@/components/passport/PassportStampSVG";
export function StampDesignPicker({ value, onChange }: { value: StampDesignKey; onChange: (value: StampDesignKey) => void }) {
  return <fieldset><legend className="mb-2 text-xs font-semibold">Stamp design</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(Object.keys(STAMP_DESIGNS) as StampDesignKey[]).map(key => <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)} className={`flex flex-col items-center rounded-lg border p-2 text-[10px] ${value === key ? "border-beat-gold bg-beat-gold/10" : "border-beat-border"}`}><PassportStampSVG design={key} verified className="h-14 w-14" />{STAMP_DESIGNS[key].label}</button>)}</div></fieldset>;
}
