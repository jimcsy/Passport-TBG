"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, GitBranch, Sparkles } from "lucide-react";
import { createPlanAction } from "@/lib/actions/plans";

const BRANDS = [
  "All Bistro Group Brands",
  "TGI Fridays",
  "Italianni's",
  "Texas Roadhouse",
  "Denny's",
  "Watami",
  "Modern Shanghai",
  "Buffalo Wild Wings",
];

export function CreatePlanModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const selectedBrand = formData.get("restaurantBrand") as string;
    if (selectedBrand === "All Bistro Group Brands") {
      formData.delete("restaurantBrand");
    }

    const res = await createPlanAction(formData);

    if (res.success && res.data) {
      const plan = res.data as { id: string };
      setIsOpen(false);
      router.push(`/trainer/plans/${plan.id}/builder`);
    } else {
      setError(res.error || "Failed to create plan.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-2xl bg-beat-maroon px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-beat-maroon-dark transition-all cursor-pointer border border-beat-gold/30"
      >
        <Plus className="h-4 w-4 text-beat-gold" />
        <span>New Training Plan</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-beat-gold/40 text-beat-maroon">
            <div className="flex items-start justify-between pb-4 border-b border-beat-border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-beat-maroon text-beat-gold">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Create Training Plan</h2>
                  <p className="text-xs text-beat-muted">
                    Build a custom role-based milestone track for trainees.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-beat-maroon/60 hover:bg-beat-canvas hover:text-beat-maroon transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-beat-maroon mb-1">
                  Plan Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g. Specialty Barista Training Track"
                  className="w-full rounded-xl border border-beat-border bg-beat-canvas px-3.5 py-2.5 font-medium text-beat-maroon placeholder:text-beat-maroon/40 focus:border-beat-gold focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-beat-maroon mb-1">
                    Role Identifier <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="roleIdentifier"
                    required
                    placeholder="e.g. BARISTA or LINE_COOK"
                    className="w-full rounded-xl border border-beat-border bg-beat-canvas px-3.5 py-2.5 font-mono text-xs uppercase text-beat-maroon placeholder:text-beat-maroon/40 focus:border-beat-gold focus:outline-hidden"
                  />
                  <span className="text-[10px] text-beat-muted mt-0.5 block">
                    Canonical role key used for matching.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-beat-maroon mb-1">
                    Applicable Brand
                  </label>
                  <select
                    name="restaurantBrand"
                    className="w-full rounded-xl border border-beat-border bg-beat-canvas px-3 py-2.5 text-beat-maroon focus:border-beat-gold focus:outline-hidden"
                  >
                    {BRANDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-beat-maroon mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Summarize the core competencies and learning objectives of this training track..."
                  className="w-full rounded-xl border border-beat-border bg-beat-canvas px-3.5 py-2.5 text-beat-maroon placeholder:text-beat-maroon/40 focus:border-beat-gold focus:outline-hidden resize-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-beat-border">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-beat-maroon/70 hover:bg-beat-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-beat-maroon px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-beat-maroon-dark transition-all disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4 text-beat-gold" />
                  <span>{isSubmitting ? "Creating..." : "Create & Launch Builder"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
