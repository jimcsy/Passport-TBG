"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Inbox,
  CheckSquare,
  Clock,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { QueueItemCard } from "@/components/admin/QueueItemCard";
import { BatchSignOffTool } from "@/components/admin/BatchSignOffTool";
import type { ReviewQueueItem, BatchToolData } from "@/lib/db/repositories/admin";

interface VerificationHubProps {
  queueItems: ReviewQueueItem[];
  batchData: BatchToolData;
  initialTab?: "queue" | "batch";
}

export function VerificationHub({
  queueItems,
  batchData,
  initialTab = "queue",
}: VerificationHubProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTabParam = searchParams.get("tab");
  const [selectedTab, setActiveTab] = useState<"queue" | "batch">(
    currentTabParam === "batch" ? "batch" : initialTab
  );

  const focusedReview = searchParams.get("review");
  const activeTab = focusedReview ? "queue" : selectedTab;

  const handleTabChange = (tab: "queue" | "batch") => {
    setActiveTab(tab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    params.delete("review");
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  const uniqueTraineesInQueue = new Set(queueItems.map((item) => item.traineeId)).size;

  return (
    <div className="space-y-6">
      {/* Page Title & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-beat-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-beat-maroon tracking-tight">
              Verifications
            </h1>
          </div>
          <p className="text-xs text-beat-muted mt-1">
            Review trainee milestone submissions and conduct cohort batch sign-offs in one place.
          </p>
        </div>

        {/* Quick Metrics Badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-beat-card px-4 py-2 border border-beat-border shadow-xs">
            <Clock className={`h-4 w-4 ${queueItems.length > 0 ? "text-beat-maroon" : "text-beat-muted"}`} />
            <span className="font-semibold text-beat-maroon">
              {queueItems.length}
            </span>
            <span className="text-beat-muted">Pending Reviews</span>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-beat-card px-4 py-2 border border-beat-border shadow-xs">
            <Users className="h-4 w-4 text-beat-gold" />
            <span className="font-semibold text-beat-maroon">
              {batchData.trainees.length}
            </span>
            <span className="text-beat-muted">Eligible Trainees</span>
          </div>
        </div>
      </div>

      {/* Segmented Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-beat-border pb-px">
        <button
          type="button"
          onClick={() => handleTabChange("queue")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-lg font-bold text-sm transition-all border-b-2 -mb-px ${
            activeTab === "queue"
              ? "border-beat-maroon bg-white text-beat-maroon shadow-xs"
              : "border-transparent text-beat-muted hover:text-beat-maroon hover:bg-white/50"
          }`}
        >
          <Inbox className={`h-4 w-4 ${activeTab === "queue" ? "text-beat-maroon" : "text-beat-muted"}`} />
          <span>Review Queue</span>
          <span
            className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-semibold ${
              queueItems.length > 0
                ? "bg-beat-gold/10 text-beat-maroon"
                : "bg-beat-canvas text-beat-muted border border-beat-border"
            }`}
          >
            {queueItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("batch")}
          className={`flex items-center gap-2 px-5 py-3 rounded-t-lg font-bold text-sm transition-all border-b-2 -mb-px ${
            activeTab === "batch"
              ? "border-beat-maroon bg-white text-beat-maroon shadow-xs"
              : "border-transparent text-beat-muted hover:text-beat-maroon hover:bg-white/50"
          }`}
        >
          <CheckSquare className={`h-4 w-4 ${activeTab === "batch" ? "text-beat-maroon" : "text-beat-muted"}`} />
          <span>Cohort Batch Sign-Off</span>
          <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full font-semibold bg-beat-canvas text-beat-muted border border-beat-border">
            {batchData.trainees.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Review Queue */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs text-beat-muted">
              Review milestones submitted by your trainees.
            </p>
            {queueItems.length > 0 && (
              <span className="text-xs font-semibold text-beat-maroon">
                {queueItems.length} {queueItems.length === 1 ? "submission" : "submissions"} across {uniqueTraineesInQueue} {uniqueTraineesInQueue === 1 ? "trainee" : "trainees"}
              </span>
            )}
          </div>

          {queueItems.length === 0 ? (
            <div className="rounded-xl bg-beat-card p-12 text-center border border-beat-border shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-beat-maroon">
                  No pending reviews
                </h3>
                <p className="text-xs text-beat-muted max-w-sm mx-auto">
                  Submissions appear here when trainees request a review.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleTabChange("batch")}
                  className="inline-flex items-center gap-2 rounded-lg bg-beat-maroon px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-beat-maroon/90 transition-all"
                >
                  <CheckSquare className="h-4 w-4 text-beat-gold" />
                  <span>Open Cohort Batch Sign-Off</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {queueItems.map((item) => (
                <QueueItemCard key={item.id} item={item} focused={focusedReview === item.id} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Batch Sign-Off */}
      {activeTab === "batch" && (
        <div className="space-y-4">
          <p className="text-xs text-beat-muted">
            Select trainees and a milestone to approve a group in one step.
          </p>
          <BatchSignOffTool data={batchData} />
        </div>
      )}
    </div>
  );
}
