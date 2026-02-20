export interface Session {
  id: string;
  host_name: string;
  created_at: string;
  all_voted: boolean;
  coins_per_participant: number;
}

export interface Participant {
  id: string;
  session_id: string;
  name: string;
  has_voted: boolean;
}

export interface Task {
  id: string;
  session_id: string;
  title: string;
  position: number;
}

export interface Vote {
  id: string;
  session_id: string;
  participant_id: string;
  task_id: string | null; // null = "Fewer Tasks" option
  coins: number;
}

export interface Assignment {
  participant_id: string;
  participant_name: string;
  tasks: Task[];
}
