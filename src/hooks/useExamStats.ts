import { useState, useEffect } from 'react';
import { 
  getUserExamStats, 
  getAllUserExamStats, 
  getUserTestAttempts,
  getExamLeaderboard,
  storeTestAttempt,
  type ExamStatsData,
  type TestAttempt
} from '@/lib/firebaseExamStats';
import { useAuth } from './useAuth';

export const useExamStats = (examId?: string) => {
  const { getUserId } = useAuth();
  const [stats, setStats] = useState<ExamStatsData | null>(null);
  const [allStats, setAllStats] = useState<ExamStatsData[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load stats for a specific exam
  const loadExamStats = async (targetExamId: string) => {
    const userId = getUserId();
    if (!userId) return;

    setLoading(true);
    try {
      const result = await getUserExamStats(userId, targetExamId);
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading exam stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load all user stats (for dashboard)
  const loadAllStats = async () => {
    const userId = getUserId();
    if (!userId) return;

    setLoading(true);
    try {
      const result = await getAllUserExamStats(userId);
      if (result.success) {
        setAllStats(result.data);
      }
    } catch (error) {
      console.error('Error loading all stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load test attempts for an exam
  const loadTestAttempts = async (targetExamId: string, limit = 20) => {
    const userId = getUserId();
    if (!userId) return;

    try {
      const result = await getUserTestAttempts(userId, targetExamId, limit);
      if (result.success) {
        setAttempts(result.data);
      }
    } catch (error) {
      console.error('Error loading test attempts:', error);
    }
  };

  // Load leaderboard for an exam
  const loadLeaderboard = async (targetExamId: string, limit = 50) => {
    try {
      const result = await getExamLeaderboard(targetExamId, limit);
      if (result.success) {
        setLeaderboard(result.data);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  // Submit a test attempt
  const submitTestAttempt = async (
    targetExamId: string,
    score: number,
    totalQuestions: number,
    correctAnswers: number,
    timeTaken: number,
    answers: any
  ) => {
    const userId = getUserId();
    if (!userId) return { success: false, error: 'User not authenticated' };

    try {
      const result = await storeTestAttempt(
        userId,
        targetExamId,
        score,
        totalQuestions,
        correctAnswers,
        timeTaken,
        answers
      );

      if (result.success) {
        // Refresh stats after submitting
        if (examId === targetExamId) {
          await loadExamStats(targetExamId);
        }
        await loadTestAttempts(targetExamId);
      }

      return result;
    } catch (error) {
      console.error('Error submitting test attempt:', error);
      return { success: false, error: 'Failed to submit test attempt' };
    }
  };

  // Load initial data
  useEffect(() => {
    if (examId) {
      loadExamStats(examId);
      loadTestAttempts(examId);
    }
  }, [examId]);

  return {
    stats,
    allStats,
    attempts,
    leaderboard,
    loading,
    loadExamStats,
    loadAllStats,
    loadTestAttempts,
    loadLeaderboard,
    submitTestAttempt,
    refreshStats: () => examId && loadExamStats(examId)
  };
};