import { BookOpen, Calendar, MapPin, Building2, Award, CheckCircle2, Clock } from "lucide-react";

interface PassportCoverProps {
  trainee: {
    traineeCode: string;
    fullName: string;
    restaurantBrand: string;
    branchLocation: string;
    cohortBatch: string;
    hireDate: Date;
  };
  stats: {
    totalMilestones: number;
    verifiedCount: number;
    readyForReviewCount: number;
    overallPercent: number;
  };
}

export function PassportCover({ trainee, stats }: PassportCoverProps) {
  // Circular progress calculation
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (stats.overallPercent / 100) * circumference;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-beat-card p-6 sm:p-8 shadow-lg border border-beat-border">
      {/* Decorative top brand bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-beat-maroon via-beat-gold to-beat-maroon" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Trainee Profile Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-beat-maroon text-beat-gold shadow-md ring-4 ring-beat-gold/20">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-beat-canvas px-2.5 py-0.5 text-[11px] font-bold text-beat-maroon border border-beat-border">
                  <Award className="h-3 w-3 text-beat-gold" />
                  BEAT Trainee
                </span>
                <span className="font-mono text-xs font-bold text-beat-gold bg-beat-maroon/5 px-2 py-0.5 rounded-md border border-beat-border">
                  {trainee.traineeCode}
                </span>
              </div>
              <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-beat-maroon tracking-tight">
                {trainee.fullName}
              </h2>
            </div>
          </div>

          {/* Metadata Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs text-beat-muted">
            <div className="flex items-center gap-2 rounded-xl bg-beat-canvas p-2.5 border border-beat-border">
              <Building2 className="h-4 w-4 text-beat-gold shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-beat-maroon/70">Brand</p>
                <p className="font-semibold text-beat-maroon">{trainee.restaurantBrand}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-beat-canvas p-2.5 border border-beat-border">
              <MapPin className="h-4 w-4 text-beat-gold shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-beat-maroon/70">Branch</p>
                <p className="font-semibold text-beat-maroon">{trainee.branchLocation}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-beat-canvas p-2.5 border border-beat-border">
              <Calendar className="h-4 w-4 text-beat-gold shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-beat-maroon/70">Batch</p>
                <p className="font-semibold text-beat-maroon">{trainee.cohortBatch}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Circular Progress Ring & Summary */}
        <div className="flex items-center gap-6 sm:justify-end border-t md:border-t-0 md:border-l border-beat-border pt-4 md:pt-0 md:pl-8">
          <div className="relative flex items-center justify-center">
            <svg role="img" aria-label={`${stats.overallPercent}% of milestones verified`} className="h-28 w-28 -rotate-90 transform" viewBox="0 0 96 96">
              {/* Background circle */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-beat-border"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-beat-gold transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-beat-maroon">
                {stats.overallPercent}%
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-beat-muted">
                Complete
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-beat-gold" />
              <span className="font-semibold text-beat-maroon">
                {stats.verifiedCount} / {stats.totalMilestones}
              </span>
              <span className="text-beat-muted">Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-beat-gold" />
              <span className="font-semibold text-beat-maroon">
                {stats.readyForReviewCount}
              </span>
              <span className="text-beat-muted">In Review</span>
            </div>
            <div className="pt-1">
              <span className="passport-stamp px-2.5 py-0.5 text-[9px] text-beat-gold border-beat-gold">
                Growth Passport
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
