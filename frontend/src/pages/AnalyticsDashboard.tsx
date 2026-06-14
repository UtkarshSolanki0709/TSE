import React, { useEffect } from 'react';
import { useSearchStore } from '../store/useSearchStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Activity, BarChart3, AlertCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA'];

export const AnalyticsDashboard: React.FC = () => {
  const { analytics, gaps, fetchAnalytics } = useSearchStore();

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4 text-blue-400">
            <Activity className="w-5 h-5" />
            <span className="font-semibold text-white/70">Total Searches</span>
          </div>
          <div className="text-3xl font-bold">
            {analytics.reduce((acc, curr) => acc + curr.count, 0)}
          </div>
        </div>
        
        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4 text-emerald-400">
            <TrendingUp className="w-5 h-5" />
            <span className="font-semibold text-white/70">Avg Latency</span>
          </div>
          <div className="text-3xl font-bold">
            {analytics.length > 0 
              ? (analytics.reduce((acc, curr) => acc + curr.avgLatency, 0) / analytics.length).toFixed(1)
              : 0}ms
          </div>
        </div>

        <div className="glass p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4 text-amber-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold text-white/70">Zero-Result Queries</span>
          </div>
          <div className="text-3xl font-bold">{gaps.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Popular Queries Chart */}
        <div className="glass p-8 rounded-2xl">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-semibold">Popular Search Terms</h3>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis 
                  dataKey="query" 
                  stroke="#ffffff40" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#ffffff40" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #ffffff10',
                    borderRadius: '12px'
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {analytics.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Content Gaps Table */}
        <div className="glass p-8 rounded-2xl">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-amber-400" />
            <h3 className="text-xl font-semibold">Discovery Gaps</h3>
          </div>
          <p className="text-sm text-white/40 mb-6">
            Terms users searched for that produced zero results. Target these URLs for crawling.
          </p>
          
          <div className="space-y-3">
            {gaps.length > 0 ? gaps.map((gap, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={gap} 
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5"
              >
                <span className="font-medium text-white/80">{gap}</span>
                <span className="text-[10px] uppercase font-bold text-amber-500/50 bg-amber-500/10 px-2 py-1 rounded">
                  No Results
                </span>
              </motion.div>
            )) : (
              <div className="text-center py-12 text-white/10 italic">
                No search gaps identified yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
