import Link from "next/link";
import { cohortDirectoryHref, type CohortHeatmapData } from "@/lib/dashboard/cohorts";

function intensity(percent: number) {
  return percent <= 25 ? "bg-beat-gold/10" : percent <= 50 ? "bg-beat-gold/40" : percent <= 75 ? "bg-beat-gold/70" : "bg-beat-gold";
}

export function CohortProgressHeatmap({ data }: { data: CohortHeatmapData[] }) {
  const brands = Array.from(new Set(data.map(cell => cell.brand)));
  const cohorts = Array.from(new Set(data.map(cell => cell.cohort))).sort();
  const cells = new Map(data.map(cell => [JSON.stringify([cell.brand, cell.cohort]), cell]));
  const cellLink = (cell: CohortHeatmapData) => <Link href={cohortDirectoryHref(cell.brand, cell.cohort)}
    aria-label={`${cell.brand}, ${cell.cohort}: ${cell.avgCompletionPct}% completion, ${cell.traineeCount} trainees`}
    className={`flex min-h-16 flex-col justify-center rounded-lg p-3 text-beat-maroon transition-shadow hover:ring-2 hover:ring-beat-maroon focus-visible:ring-2 focus-visible:ring-beat-maroon ${intensity(cell.avgCompletionPct)}`}>
    <span className="text-lg font-semibold">{cell.avgCompletionPct}%</span><span className="text-xs">{cell.traineeCount} {cell.traineeCount === 1 ? "trainee" : "trainees"}</span>
  </Link>;
  return <section className="min-w-0 rounded-xl border border-beat-border bg-white p-4 sm:p-6" aria-labelledby="cohort-heading">
    <h2 id="cohort-heading" className="text-lg font-semibold text-beat-maroon">Cohort progress</h2>
    <p className="mt-1 text-sm text-beat-muted">Average completion across trainees with an active training plan. Select a cohort to view its trainees.</p>
    {!data.length ? <p className="py-10 text-center text-sm text-beat-muted">No active training cohorts yet. Assign a training plan to see progress here.</p> : <>
      <div className="mt-5 space-y-3 lg:hidden">{data.map(cell => <div key={JSON.stringify([cell.brand, cell.cohort])} className="grid grid-cols-[1fr_auto] items-center gap-4"><div className="min-w-0 text-sm text-beat-maroon"><p className="break-words font-semibold">{cell.brand}</p><p className="break-words text-xs text-beat-muted">{cell.cohort}</p></div>{cellLink(cell)}</div>)}</div>
      <div className="mt-5 hidden overflow-x-auto lg:block"><table className="w-full border-separate border-spacing-2 text-left text-sm"><caption className="sr-only">Average trainee completion by restaurant brand and cohort</caption><thead><tr><th scope="col">Brand</th>{cohorts.map(cohort => <th scope="col" key={cohort} className="p-2 font-medium text-beat-maroon">{cohort}</th>)}</tr></thead><tbody>{brands.map(brand => <tr key={brand}><th scope="row" className="pr-4 font-medium text-beat-maroon">{brand}</th>{cohorts.map(cohort => { const cell = cells.get(JSON.stringify([brand, cohort])); return <td key={cohort}>{cell ? cellLink(cell) : <span className="block p-3 text-center text-beat-muted" aria-label="No active trainees">—</span>}</td>; })}</tr>)}</tbody></table></div>
      <p className="mt-4 text-xs text-beat-muted">Color intensity: 0–25% · 26–50% · 51–75% · 76–100%. Trainees with an empty plan count as 0%.</p>
    </>}
  </section>;
}
