export type DrinkingSession = {
  id: string;
  user_id: string;
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
  location_name: string | null;
  mood: string | null;
  notes: string | null;
  created_at: string;
};

export type DrinkLog = {
  id: string;
  session_id: string;
  user_id: string;
  drink_name: string;
  amount: number;
  abv: number | null;
  volume_ml: number | null;
  consumed_at: string;
  note: string | null;
  created_at: string;
};

export type DrinkLogWithSession = DrinkLog & {
  drinking_sessions: { session_date: string } | null;
};
