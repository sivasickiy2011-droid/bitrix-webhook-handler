export interface TimelineLog {
  ID: string;
  CREATED: string;
  AUTHOR_ID: string;
  SETTINGS?: {
    COMMENT?: string;
    TITLE?: string;
    MESSAGE?: string;
  };
  ASSOCIATED_ENTITY_TYPE_ID?: string;
  ASSOCIATED_ENTITY_ID?: string;
  STATS?: {
    total_runs: number;
    last_run?: string;
    has_history: boolean;
  };
}

export const BP_LOGS_URL = 'https://functions.poehali.dev/f6e71011-6a3a-4e15-b54b-774b4357063f';
export const TIMELINE_URL = 'https://functions.poehali.dev/4cb6e52c-3777-4095-a59b-37d01e978ff6';