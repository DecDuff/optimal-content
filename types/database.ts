export type UserRole = "creator" | "optimizer";

/** Must match DB check constraint on `tasks.status`. */
export type TaskStatus =
  | "open"
  | "claimed"
  | "submitted"
  | "approved"
  | "disputed"
  | "appealed"
  | "awaiting_checkout";

export type ChecklistState = Record<"1" | "2" | "3" | "4" | "5", boolean>;

export type ProfileRow = {
  id: string;
  role: UserRole;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

/** `budget` is USD cents (integer), column name in Supabase: `budget`. */
export type MessageRow = {
  id: string;
  task_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type TaskRow = {
  id: string;
  creator_id: string;
  optimizer_id: string | null;
  title: string;
  description: string;
  video_url: string;
  tags: string[] | null;
  complexity_level: string | null;
  target_platform: string | null;
  budget: number;
  status: TaskStatus;
  claimed_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;
  submission_url: string | null;
  appeal_reason: string | null;
  checklist: ChecklistState;
  created_at: string;
  updated_at: string;
};