"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, ShieldCheck, Activity, Users, AlertTriangle, 
  Search, Shield, AlertOctagon, RefreshCw, LayoutDashboard
} from "lucide-react";

export default function SecurityDashboard() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [highRiskUsers, setHighRiskUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("monitoring");

  useEffect(() => {
    fetchSecurityData();
    const interval = setInterval(fetchSecurityData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchSecurityData = async () => {
    try {
      const res = await fetch('/api/security/incidents');
      const data = await res.json();
      setIncidents(data.incidents || []);
      setHighRiskUsers(data.highRiskUsers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'low': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'high': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'critical': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeThreats = incidents.filter(i => i.status === 'active').length;
  const criticalThreats = incidents.filter(i => i.severity === 'critical' && i.status === 'active').length;

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar Layout */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 z-20 overflow-y-auto">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 sticky top-0 bg-white">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center mr-3 shadow-sm">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-lg text-slate-900">Secure<span className="text-primary">EHR</span></span>
        </div>
        
        <div className="p-4 pb-20">
          <div className="flex items-center gap-3 p-3 mb-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <Shield className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">System Security</p>
              <p className="text-xs text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("monitoring")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                activeTab === "monitoring" 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Activity className={`w-5 h-5 ${activeTab === "monitoring" ? "text-white" : "text-slate-400"}`} />
              Live Monitoring
            </button>
            <button
              onClick={() => setActiveTab("incidents")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                activeTab === "incidents" 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <ShieldAlert className={`w-5 h-5 ${activeTab === "incidents" ? "text-white" : "text-slate-400"}`} />
              Incident Logs
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto relative bg-slate-50/50">
        <div className="max-w-6xl mx-auto p-6 lg:p-10 pb-24">
          <AnimatePresence mode="wait">
            
            {activeTab === "monitoring" && (
              <motion.div key="monitoring" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-900">AI Threat Detection</h2>
                    <p className="text-slate-500 mt-1">Real-time AI monitoring and anomaly detection.</p>
                  </div>
                  <button onClick={fetchSecurityData} className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors border border-slate-200 shadow-sm text-slate-700">
                    <RefreshCw className="w-4 h-4" /> Refresh
                  </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900">Live</p>
                    <p className="text-sm font-semibold text-slate-500 mt-1">Total Scans</p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900">{activeThreats}</p>
                    <p className="text-sm font-semibold text-slate-500 mt-1">Active Threats</p>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                      <AlertOctagon className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-extrabold text-red-600">{criticalThreats}</p>
                    <p className="text-sm font-semibold text-slate-500 mt-1">Critical Incidents</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Incidents Preview */}
                  <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl shadow-soft border border-slate-200 p-8 h-full">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-500" /> Recent Activity
                          </h2>
                          <p className="text-sm text-slate-500">Latest security anomalies.</p>
                        </div>
                      </div>

                      {incidents.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-medium">No security incidents detected.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {incidents.slice(0, 5).map((inc) => (
                            <div key={inc.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50 relative overflow-hidden group">
                              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: inc.severity === 'critical' ? '#ef4444' : inc.severity === 'high' ? '#f97316' : inc.severity === 'medium' ? '#f59e0b' : '#3b82f6' }}></div>
                              
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-bold text-slate-900">{inc.threat_type.replace(/_/g, ' ')}</h3>
                                  <p className="text-xs font-semibold text-slate-500 mt-0.5">{inc.profiles?.full_name} ({inc.user_role})</p>
                                </div>
                                <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${getSeverityColor(inc.severity)}`}>
                                  Score: {inc.risk_score}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 mt-2">{inc.description}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* High Risk Users */}
                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-3xl shadow-soft border border-slate-200 p-8 h-full">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-amber-500" /> High Risk
                          </h2>
                          <p className="text-sm text-slate-500">Users flagged by AI.</p>
                        </div>
                      </div>
                      
                      <div className="divide-y divide-slate-100">
                        {highRiskUsers.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-slate-500 text-sm">No high-risk users identified.</p>
                          </div>
                        ) : highRiskUsers.map(user => (
                          <div key={user.user_id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold">
                                {user.profiles?.full_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 text-sm">{user.profiles?.full_name}</p>
                                <p className="text-xs text-slate-500 capitalize">{user.profiles?.role}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Score</p>
                              <p className={`font-mono font-bold text-sm ${user.total_score > 80 ? 'text-red-500' : 'text-amber-500'}`}>{user.total_score}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {activeTab === "incidents" && (
              <motion.div key="incidents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="mb-8">
                  <h2 className="text-3xl font-extrabold text-slate-900">Incident Logs</h2>
                  <p className="text-slate-500 mt-1">Complete history of security events.</p>
                </div>

                <div className="bg-white rounded-3xl shadow-soft border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                          <th className="p-5">Time</th>
                          <th className="p-5">User</th>
                          <th className="p-5">Threat Type</th>
                          <th className="p-5">Score</th>
                          <th className="p-5">Severity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {incidents.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">No security incidents detected.</td>
                          </tr>
                        ) : incidents.map(inc => (
                          <tr key={inc.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-5 text-sm font-semibold text-slate-900 whitespace-nowrap">{new Date(inc.created_at).toLocaleString()}</td>
                            <td className="p-5">
                              <p className="text-sm font-bold text-slate-900">{inc.profiles?.full_name}</p>
                              <p className="text-xs text-slate-500 capitalize">{inc.user_role}</p>
                            </td>
                            <td className="p-5">
                              <div className="text-sm text-slate-700">
                                <p className="font-bold text-slate-900">{inc.threat_type.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-slate-500 truncate max-w-[200px]" title={inc.description}>{inc.description}</p>
                              </div>
                            </td>
                            <td className="p-5">
                              <span className="font-mono font-bold text-slate-600">{inc.risk_score}</span>
                            </td>
                            <td className="p-5">
                              <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${getSeverityColor(inc.severity)}`}>
                                {inc.severity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
