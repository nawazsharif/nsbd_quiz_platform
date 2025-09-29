'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Trophy, Medal, Crown, User } from 'lucide-react';

type LeaderboardEntry = {
  user_id: number;
  name: string;
  avatar_url?: string;
  progress_percent: number;
  score?: number;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/backend';

export default function CourseLeaderboardPage() {
  const params = useParams();
  const id = params?.id as string;
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        const res = await fetch(`${API_BASE_URL}/courses/${id}/leaderboard`);
        if (!res.ok) throw new Error('Not available');
        const data = await res.json();
        if (mounted) {
          setEntries(data?.data || data || []);
          setIsLoading(false);
        }
      } catch {
        if (mounted) {
          // Fallback sample data until backend endpoint exists
          setEntries([
            { user_id: 1, name: 'Top Learner', progress_percent: 98, score: 980 },
            { user_id: 2, name: 'Active Student', progress_percent: 82, score: 820 },
            { user_id: 3, name: 'Rising Star', progress_percent: 67, score: 670 },
          ]);
          setIsLoading(false);
        }
      }
    }
    if (id) run();
    return () => { mounted = false };
  }, [id]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Trophy className="w-7 h-7 text-amber-500" /> Course Leaderboard
        </h1>

        {isLoading ? (
          <div>Loading...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, idx) => (
              <div key={entry.user_id} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                    {entry.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.avatar_url} alt={entry.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{idx + 1}. {entry.name}</div>
                    <div className="text-sm text-slate-600">Progress: {Math.round(entry.progress_percent)}%</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {idx === 0 && <Crown className="w-5 h-5 text-amber-500" />}
                  {idx === 1 && <Medal className="w-5 h-5 text-slate-500" />}
                  {idx === 2 && <Medal className="w-5 h-5 text-amber-700" />}
                  <span className="text-slate-900 font-semibold">{entry.score ?? Math.round(entry.progress_percent * 10)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
