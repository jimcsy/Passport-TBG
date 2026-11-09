import {
  strobiTipQuestionSchema, strobiTipFallbackReasonSchema, strobiTipResultSchema,
  type StrobiTipAnswer, type StrobiTipQuestionId, type StrobiTipErrorCode,
} from "@/lib/validations/strobi-tips";

export const STROBI_TIP_QUESTION_LABELS: Record<StrobiTipQuestionId, string> = {
  EXPLAIN_MILESTONE: "Explain this milestone",
  PRACTICE_ACTIVITY: "Give me a practice activity",
  SHOW_EXAMPLE: "Show an example",
  PREPARE_FOR_REVIEW: "Help me prepare for review",
};
export const STROBI_TIPS_NOTICE = "AI tips can be wrong. Milestone text is sent to Google, which may use free-tier content to improve its products. Use only nonconfidential training content. Your trainer decides verification.";
export const STROBI_TIPS_AUTHOR_NOTICE = "Use only nonconfidential milestone wording. When trainee Strobi Tips is enabled, the title, description and pillar may be sent to Google and generic tips reused across trainees. Do not include personal details, confidential policies or restricted business information.";
export const STROBI_TIPS_ALLOWANCE_HELP = "Only new AI requests use your daily allowance. Reused and prewritten tips do not. Once sent to Google, a request counts even if it fails, times out or is cancelled. Application allowances reset at midnight Asia/Manila; Google's limits are separate.";

/** Generic guidance only: does not pretend to read materials or know completion. */
const prewrittenTips: Record<StrobiTipQuestionId, StrobiTipAnswer> = {
  EXPLAIN_MILESTONE: {
    answer: "Use the milestone title and description to identify the skill you are practicing. Its verification criteria describe what your trainer needs to observe. This is a general practice tip, not an assessment of your work.",
    steps: ["Name the skill in your own words.", "Find one action in the criteria that you can demonstrate.", "Ask your trainer about any criterion that is unclear."],
  },
  PRACTICE_ACTIVITY: {
    answer: "Choose one action from your milestone's criteria and practice it in a simple, appropriate situation. Use the materials on your module page if they are available. This activity does not submit a review or demonstrate completion by itself.",
    steps: ["Set one small practice goal based on a criterion.", "Try the task, then identify what worked and what needs improvement.", "Repeat once and note a question for your trainer."],
  },
  SHOW_EXAMPLE: {
    answer: "For example, practice explaining a routine task to a colleague: state the goal, describe one action clearly, then check their understanding. Adapt the situation to the skill in your milestone. This is an illustrative practice example, not company policy or evidence that you have completed the milestone.",
    steps: ["Choose a situation relevant to your milestone.", "Compare your approach with its verification criteria.", "Identify one change that would make the demonstration clearer."],
  },
  PREPARE_FOR_REVIEW: {
    answer: "Prepare to show your own learning using the milestone's verification criteria. Your trainer decides whether the evidence demonstrates the competency. This checklist does not write your reflection, submit a review or award a stamp.",
    steps: ["Which criterion can you demonstrate, and what did you actually do?", "What evidence or explanation can you provide without sharing confidential information?", "What remains unclear, or needs more practice, before you request review?"],
  },
};

/** A validated fresh object; caller still must establish trainee eligibility. */
export function getPrewrittenStrobiTip(questionId: unknown, reason: unknown) {
  const question = strobiTipQuestionSchema.parse(questionId);
  return strobiTipResultSchema.parse({
    success: true, source: "PREWRITTEN", tip: prewrittenTips[question],
    reason: strobiTipFallbackReasonSchema.parse(reason),
  });
}

export const STROBI_TIP_ERROR_MESSAGES: Record<StrobiTipErrorCode, string> = {
  UNAUTHORIZED: "Sign in as a trainee to use Strobi Tips.",
  INVALID_INPUT: "Choose an available milestone and one of the four questions.",
  INACCESSIBLE_MILESTONE: "This milestone is not available in your current plan. Choose another milestone.",
  LOCKED_MILESTONE: "Unlock this milestone through your learning path before asking Strobi about it.",
  ARCHIVED_MILESTONE: "AI tips are unavailable for archived milestones. You can still read their existing details.",
  STALE_CONTEXT: "This milestone or its access has changed. Refresh the selection before asking again.",
  DISABLED: "AI tips are turned off. Prewritten practice tips and your learning materials remain available.",
  UNCONFIGURED: "AI tips are not configured. Prewritten practice tips and your learning materials remain available.",
  BUSY: "An AI request is already running. Wait or use a prewritten practice tip.",
  DAILY_LIMIT: "The daily new-request allowance is reached. Reused and prewritten tips remain available.",
  CANCELLED: "Request cancelled. A request already sent to Google still counts toward the allowance.",
  TIMEOUT: "The AI request took too long. Use a prewritten practice tip or continue with your module.",
  PROVIDER_QUOTA: "Google's request limit was reached. Use a prewritten practice tip or continue with your module.",
  PROVIDER_UNAVAILABLE: "Google is temporarily unavailable. Use a prewritten practice tip or continue with your module.",
  INVALID_OUTPUT: "The AI response could not be used. Use a prewritten practice tip or continue with your module.",
  REFUSED: "Strobi could not generate this tip. Use a prewritten practice tip or ask your trainer for guidance.",
  UNAVAILABLE: "AI tips are temporarily unavailable. Prewritten practice tips and your learning materials remain available.",
};
