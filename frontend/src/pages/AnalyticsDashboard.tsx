import React, { useEffect } from 'react';
import { useSearchStore } from '../store/useSearchStore';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Activity, BarChart3, AlertCircle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const AnalyticsDashboard: React.FC = () => {
  const { analytics, gaps, fetchAnalytics } = useSearchStore();

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 p-6 rounded-3xl shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-3 text-indigo-600">
            <Activity className="w-5 h-5" />
            <span className="font-semibold text-slate-600 text-sm">Total Searches</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {analytics.reduce((acc, curr) => acc + curr.count, 0)}
          </div>
        </div>
        
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 p-6 rounded-3xl shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-3 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
            <span className="font-semibold text-slate-600 text-sm">Avg Latency</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {analytics.length > 0 
              ? (analytics.reduce((acc, curr) => acc + curr.avgLatency, 0) / analytics.length).toFixed(1)
              : 0}ms
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 p-6 rounded-3xl shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-3 text-amber-600">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold text-slate-600 text-sm">Zero-Result Queries</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{gaps.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Popular Queries Chart */}
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 p-8 rounded-3xl shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <h3 className="text-xl font-extrabold text-slate-900">Popular Search Terms</h3>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="query" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {analytics.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Content Gaps Table */}
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 p-8 rounded-3xl shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-amber-600" />
            <h3 className="text-xl font-extrabold text-slate-900">Discovery Gaps</h3>
          </div>
          <p className="text-sm text-slate-500 mb-6 font-medium">
            Terms users searched for that produced zero results. Target these URLs for crawling.
          </p>
          
          <div className="space-y-3">
            {gaps.length > 0 ? gaps.map((gap, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={gap} 
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-2xl hover:bg-indigo-50/50 hover:border-indigo-200 transition-colors"
              >
                <span className="font-semibold text-slate-800">{gap}</span>
                <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg">
                  No Results
                </span>
              </motion.div>
            )) : (
              <div className="text-center py-12 text-slate-400 italic text-sm">
                No search gaps identified yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
