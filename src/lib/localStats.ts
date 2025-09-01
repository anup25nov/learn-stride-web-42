// Local storage service for exam statistics
export interface TestResult {
  id: string;
  examId: string;
  sectionId: string;
  testId: string;
  topicId?: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  timeTaken: number; // in seconds
  totalTime: number; // in seconds
  completedAt: Date;
  answers: { questionId: string; selectedOption: number; isCorrect: boolean }[];
}

export interface ExamStats {
  examId: string;
  totalTests: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  totalTimeTaken: number;
  totalQuestions: number;
  totalCorrect: number;
  lastTestDate: Date;
  streak: number;
  rank?: number;
  percentile?: number;
}

export interface UserProfile {
  phone: string;
  totalTests: number;
  overallAverage: number;
  bestExam: string;
  joinedDate: Date;
  lastActiveDate: Date;
}

const STORAGE_KEYS = {
  TEST_RESULTS: 'examace_test_results',
  EXAM_STATS: 'examace_exam_stats',
  USER_PROFILE: 'examace_user_profile',
  RANKINGS: 'examace_rankings'
} as const;

// Get current user phone
const getCurrentUserPhone = (): string | null => {
  return localStorage.getItem('userPhone');
};

// Generate unique test result ID
const generateTestId = (): string => {
  return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get user-specific storage key
const getUserStorageKey = (key: string, phone?: string): string => {
  const userPhone = phone || getCurrentUserPhone();
  return userPhone ? `${key}_${userPhone}` : key;
};

// Save test result and update statistics
export const saveTestResult = (result: Omit<TestResult, 'id' | 'completedAt'>): string => {
  const phone = getCurrentUserPhone();
  if (!phone) throw new Error('No authenticated user found');

  const testResult: TestResult = {
    ...result,
    id: generateTestId(),
    completedAt: new Date()
  };

  // Save test result
  const storageKey = getUserStorageKey(STORAGE_KEYS.TEST_RESULTS);
  const existingResults = getTestResults();
  const updatedResults = [...existingResults, testResult];
  localStorage.setItem(storageKey, JSON.stringify(updatedResults));

  // Update exam statistics
  updateExamStats(result.examId);

  // Update user profile
  updateUserProfile();

  // Update rankings (simulate with local data)
  updateLocalRankings();

  return testResult.id;
};

// Get all test results for current user
export const getTestResults = (examId?: string): TestResult[] => {
  const phone = getCurrentUserPhone();
  if (!phone) return [];

  const storageKey = getUserStorageKey(STORAGE_KEYS.TEST_RESULTS);
  const stored = localStorage.getItem(storageKey);
  
  if (!stored) return [];
  
  try {
    const results: TestResult[] = JSON.parse(stored);
    return examId 
      ? results.filter(r => r.examId === examId)
      : results;
  } catch {
    return [];
  }
};

// Update exam statistics
const updateExamStats = (examId: string): void => {
  const phone = getCurrentUserPhone();
  if (!phone) return;

  const testResults = getTestResults(examId);
  if (testResults.length === 0) return;

  const scores = testResults.map(r => r.score);
  const totalTime = testResults.reduce((acc, r) => acc + r.timeTaken, 0);
  const totalQuestions = testResults.reduce((acc, r) => acc + r.totalQuestions, 0);
  const totalCorrect = testResults.reduce((acc, r) => acc + r.correctAnswers, 0);
  
  const stats: ExamStats = {
    examId,
    totalTests: testResults.length,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    bestScore: Math.max(...scores),
    worstScore: Math.min(...scores),
    totalTimeTaken: totalTime,
    totalQuestions,
    totalCorrect,
    lastTestDate: new Date(Math.max(...testResults.map(r => new Date(r.completedAt).getTime()))),
    streak: calculateStreak(testResults),
    rank: calculateRank(examId, scores[scores.length - 1]), // Latest score for ranking
    percentile: calculatePercentile(examId, scores[scores.length - 1])
  };

  const storageKey = getUserStorageKey(STORAGE_KEYS.EXAM_STATS);
  const existingStats = getExamStats();
  const updatedStats = existingStats.filter(s => s.examId !== examId);
  updatedStats.push(stats);
  
  localStorage.setItem(storageKey, JSON.stringify(updatedStats));
};

// Get exam statistics
export const getExamStats = (examId?: string): ExamStats[] => {
  const phone = getCurrentUserPhone();
  if (!phone) return [];

  const storageKey = getUserStorageKey(STORAGE_KEYS.EXAM_STATS);
  const stored = localStorage.getItem(storageKey);
  
  if (!stored) return [];
  
  try {
    const stats: ExamStats[] = JSON.parse(stored);
    return examId 
      ? stats.filter(s => s.examId === examId)
      : stats;
  } catch {
    return [];
  }
};

// Calculate streak (consecutive days with tests)
const calculateStreak = (results: TestResult[]): number => {
  if (results.length === 0) return 0;
  
  const dates = results
    .map(r => new Date(r.completedAt).toDateString())
    .filter((date, index, arr) => arr.indexOf(date) === index)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  let streak = 1;
  const today = new Date().toDateString();
  
  if (dates[0] !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dates[0] !== yesterday.toDateString()) {
      return 0;
    }
  }
  
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffTime = prevDate.getTime() - currDate.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

// Calculate rank (simulate with local data)
const calculateRank = (examId: string, score: number): number => {
  // In a real app, this would query all users' scores
  // For now, simulate based on score ranges
  if (score >= 90) return Math.floor(Math.random() * 10) + 1; // Top 10
  if (score >= 80) return Math.floor(Math.random() * 50) + 11; // 11-60
  if (score >= 70) return Math.floor(Math.random() * 100) + 61; // 61-160
  if (score >= 60) return Math.floor(Math.random() * 200) + 161; // 161-360
  return Math.floor(Math.random() * 500) + 361; // 361+
};

// Calculate percentile
const calculatePercentile = (examId: string, score: number): number => {
  // Simulate percentile based on score
  if (score >= 95) return 99;
  if (score >= 90) return 95;
  if (score >= 85) return 90;
  if (score >= 80) return 85;
  if (score >= 75) return 75;
  if (score >= 70) return 65;
  if (score >= 65) return 55;
  if (score >= 60) return 45;
  if (score >= 55) return 35;
  return Math.max(10, Math.floor(score * 0.6));
};

// Update user profile
const updateUserProfile = (): void => {
  const phone = getCurrentUserPhone();
  if (!phone) return;

  const allResults = getTestResults();
  const allStats = getExamStats();
  
  if (allResults.length === 0) return;

  const scores = allResults.map(r => r.score);
  const examAverages = allStats.map(s => s.averageScore);
  const bestExamStats = allStats.reduce((best, current) => 
    current.averageScore > (best?.averageScore || 0) ? current : best
  );

  const profile: UserProfile = {
    phone,
    totalTests: allResults.length,
    overallAverage: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    bestExam: bestExamStats?.examId || '',
    joinedDate: new Date(Math.min(...allResults.map(r => new Date(r.completedAt).getTime()))),
    lastActiveDate: new Date(Math.max(...allResults.map(r => new Date(r.completedAt).getTime())))
  };

  const storageKey = getUserStorageKey(STORAGE_KEYS.USER_PROFILE);
  localStorage.setItem(storageKey, JSON.stringify(profile));
};

// Get user profile
export const getUserProfile = (): UserProfile | null => {
  const phone = getCurrentUserPhone();
  if (!phone) return null;

  const storageKey = getUserStorageKey(STORAGE_KEYS.USER_PROFILE);
  const stored = localStorage.getItem(storageKey);
  
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

// Update local rankings (simulate leaderboard)
const updateLocalRankings = (): void => {
  // This would normally update global rankings
  // For now, just ensure the data structure exists
  const storageKey = STORAGE_KEYS.RANKINGS;
  const stored = localStorage.getItem(storageKey);
  
  if (!stored) {
    const initialRankings = {
      lastUpdated: new Date(),
      totalUsers: Math.floor(Math.random() * 10000) + 1000
    };
    localStorage.setItem(storageKey, JSON.stringify(initialRankings));
  }
};

// Get test results with filters
export const getFilteredTestResults = (filters: {
  examId?: string;
  sectionId?: string;
  topicId?: string;
  dateRange?: { start: Date; end: Date };
}): TestResult[] => {
  let results = getTestResults();
  
  if (filters.examId) {
    results = results.filter(r => r.examId === filters.examId);
  }
  
  if (filters.sectionId) {
    results = results.filter(r => r.sectionId === filters.sectionId);
  }
  
  if (filters.topicId) {
    results = results.filter(r => r.topicId === filters.topicId);
  }
  
  if (filters.dateRange) {
    results = results.filter(r => {
      const testDate = new Date(r.completedAt);
      return testDate >= filters.dateRange!.start && testDate <= filters.dateRange!.end;
    });
  }
  
  return results.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
};

// Clear all user data (for logout)
export const clearUserData = (): void => {
  const phone = getCurrentUserPhone();
  if (!phone) return;

  Object.values(STORAGE_KEYS).forEach(key => {
    const userKey = getUserStorageKey(key);
    localStorage.removeItem(userKey);
  });
};

// Export for testing/development
export const getStorageInfo = () => {
  const phone = getCurrentUserPhone();
  return {
    currentUser: phone,
    testResults: getTestResults().length,
    examStats: getExamStats().length,
    userProfile: getUserProfile(),
    storageKeys: Object.values(STORAGE_KEYS).map(key => getUserStorageKey(key))
  };
};