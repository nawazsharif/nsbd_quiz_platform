export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  startedAt: Date;
  finishedAt?: Date;
  expiresAt?: Date;
  score?: number;
  autoScore?: number;
  manualScore?: number;
  status: 'in_progress' | 'completed' | 'expired' | 'abandoned';
  progress: QuizProgress;
  questionOrder?: number[];
  answerOrderMap?: Record<string, number[]>;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizProgress {
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredQuestions: number;
  answers: Record<string, any>;
  timeSpent: number; // in seconds
  lastActivityAt: Date;
  completionPercentage: number;
}

export interface AttemptAnswer {
  id?: string;
  attemptId: string;
  questionId: string;
  answerJson: any;
  isFinal: boolean;
  autoCorrect?: boolean;
  autoAwardedPoints?: number;
  requiresManualGrading?: boolean;
  manualAwardedPoints?: number;
  graderId?: string;
  graderFeedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizAttemptSummary {
  id: string;
  quizId: string;
  quizTitle: string;
  score?: number;
  maxScore: number;
  completionPercentage: number;
  status: QuizAttempt['status'];
  startedAt: Date;
  finishedAt?: Date;
  timeSpent: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface AttemptStatistics {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  bestScore: number;
  totalTimeSpent: number;
  averageCompletionTime: number;
  recentAttempts: QuizAttemptSummary[];
  progressTrend: {
    date: string;
    score: number;
    completionTime: number;
  }[];
}

export interface StartAttemptRequest {
  quizId: string;
}

export interface StartAttemptResponse {
  attempt: QuizAttempt;
  quiz: {
    id: string;
    title: string;
    timerSeconds?: number;
    questions: any[];
  };
}

export interface SaveProgressRequest {
  attemptId: string;
  progress: Partial<QuizProgress>;
  answers?: Record<string, any>;
}

export interface SubmitAttemptRequest {
  attemptId: string;
  finalAnswers: Record<string, any>;
}

export interface SubmitAttemptResponse {
  attempt: QuizAttempt;
  results: {
    score: number;
    maxScore: number;
    correctAnswers: number;
    incorrectAnswers: number;
    pendingAnswers: number;
    completionPercentage: number;
    timeSpent: number;
  };
}