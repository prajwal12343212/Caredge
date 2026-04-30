"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { 
  Activity, User, LogOut, KeyRound, 
  FileText, Clock, PenTool, Search, LayoutDashboard, History, Heart, ShieldCheck
} from "lucide-react";

export default function DoctorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  // Access flow states
  const [tokenInput, setTokenInput] = useState("");
  const [activeSession, setActiveSession] = useState<any>(null);
  const [patientRecords, setPatientRecords] = useState<any[]>([]);
  const [patientTreatments, setPatientTreatments] = useState<any[]>([]);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [doctorLogs, setDoctorLogs] = useState<any[]>([]);
  const [securityData, setSecurityData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("portal");
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState(100);
  const [isExpired, setIsExpired] = useState(false);

  // Treatment form states
  const [diagnosis, setDiagnosis] = useState("");
  const [prescription, setPrescription] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkUser();
    
    // Screenshot Detection Logic for Doctors
    const handleScreenshot = async (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.metaKey && e.shiftKey && (e.key === '4' || e.key === '3'))) {
        if (user?.id && activeSession?.token?.patient_id) {
          await fetch('/api/audit/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              userRole: 'doctor',
              action: 'SCREENSHOT_ATTEMPT',
              patientId: activeSession.token.patient_id,
              description: `Doctor ${profile?.full_name || user.id} attempted to take a screenshot of patient data.`
            })
          });
          toast.error("Security Policy: Screenshots of patient records are strictly prohibited and recorded.", { duration: 5000 });
        }
      }
    };

    window.addEventListener('keyup', handleScreenshot);

    // Poll security data every 10 seconds for real-time alerts
    const interval = setInterval(() => {
      if (user?.id) fetchSecurityData(user.id);
    }, 10000);
    
    return () => {
      window.removeEventListener('keyup', handleScreenshot);
      clearInterval(interval);
    };
  }, [user?.id, activeSession?.token?.patient_id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSession && !isExpired) {
      const created = new Date(activeSession.token.created_at).getTime();
      const expiry = new Date(activeSession.token.expires_at).getTime();
      const totalDuration = expiry - created;

      interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = expiry - now;

        if (distance < 0) {
          clearInterval(interval);
          setIsExpired(true);
          setTimeRemaining("EXPIRED");
          setProgressPercent(0);
        } else {
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          
          setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
          setProgressPercent((distance / totalDuration) * 100);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession, isExpired]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login?role=doctor");
      return;
    }
    setUser(session.user);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileData?.role !== "doctor") {
      router.push("/login?role=doctor");
      return;
    }
    setProfile(profileData);
    fetchDoctorLogs(session.user.id);
    fetchSecurityData(session.user.id);
  };

  const fetchSecurityData = async (doctorId: string) => {
    try {
      const res = await fetch(`/api/security/incidents?userId=${doctorId}`);
      const data = await res.json();
      setSecurityData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDoctorLogs = async (doctorId: string) => {
    try {
      const res = await fetch(`/api/audit?doctorId=${doctorId}`);
      const data = await res.json();
      if (data.logs) setDoctorLogs(data.logs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    router.push("/");
  };

  const validateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsExpired(false);
    const toastId = toast.loading("Validating E2EE token...");
    
    try {
      const res = await fetch("/api/access/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput, doctorId: user.id })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Invalid token");
      
      setActiveSession(data);
      
      fetchPatientRecords(data.token.patient_id);
      fetchPatientTreatments(data.token.patient_id);
      fetchPatientProfile(data.token.patient_id);
      fetchDoctorLogs(user.id);
      
      toast.success("Connection Established", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message, { id: toastId });
      setActiveSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatientRecords = async (patientId: string) => {
    try {
      const res = await fetch(`/api/records?patientId=${patientId}`);
      const data = await res.json();
      if (data.records) setPatientRecords(data.records);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPatientTreatments = async (patientId: string) => {
    try {
      const res = await fetch(`/api/treatment/${patientId}`);
      const data = await res.json();
      if (data.treatments) {
        // Decrypt treatments
        const decrypted = await Promise.all(data.treatments.map(async (t: any) => {
          try {
            return {
              ...t,
              diagnosis: t.diagnosis,
              prescription: t.prescription,
              notes: t.notes
            };
          } catch (e) {
            return t;
          }
        }));
        setPatientTreatments(decrypted);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPatientProfile = async (patientId: string) => {
    try {
      const res = await fetch(`/api/patient/profile?patientId=${patientId}`);
      const data = await res.json();
      if (data.profile) {
        const p = data.profile;
        try {
          const decrypted = {
            ...p,
            allergies: p.allergies || [],
            chronic_diseases: p.chronic_diseases || [],
            current_medications: p.current_medications || [],
            past_surgeries: p.past_surgeries || [],
            family_history: p.family_history,
            emergency_contact: p.emergency_contact
          };
          setPatientProfile(decrypted);
        } catch (e) {
          setPatientProfile(p);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return toast.error("Session expired");
    
    setIsSubmitting(true);
    const toastId = toast.loading("Saving treatment...");
    
    try {
      const res = await fetch("/api/treatment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: user.id,
          patientId: activeSession.token.patient_id,
          tokenId: activeSession.token.id,
          diagnosis,
          prescription,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Treatment saved!", { id: toastId });
      setDiagnosis("");
      setPrescription("");
      setNotes("");
      
      fetchPatientTreatments(activeSession.token.patient_id);
      fetchDoctorLogs(user.id);
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewRecord = async (record: any) => {
    window.open(record.file_url, "_blank");
  };

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      
      {/* Sidebar Layout */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center mr-3 shadow-sm">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-lg text-slate-900">Secure<span className="text-primary">EHR</span></span>
        </div>
        
        <div className="p-4">
          <div className="flex items-center gap-3 p-3 mb-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <User className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">Dr. {profile.full_name}</p>
              <p className="text-xs text-slate-500">Medical Professional</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("portal")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                activeTab === "portal" 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard className={`w-5 h-5 ${activeTab === "portal" ? "text-white" : "text-slate-400"}`} />
              Access Portal
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                activeTab === "activity" 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <History className={`w-5 h-5 ${activeTab === "activity" ? "text-white" : "text-slate-400"}`} />
              Session Activity
            </button>
          </nav>
        </div>
        
        <div className="absolute bottom-4 left-4 right-4">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 rounded-xl hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto relative bg-slate-50/50">
        <div className="max-w-6xl mx-auto p-6 lg:p-10">
          <AnimatePresence mode="wait">
            {securityData?.incidents && securityData.incidents.length > 0 && securityData.incidents[0].status === 'active' && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm mb-6">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-800 text-sm">Security Feedback: {securityData.incidents[0].threat_type.replace(/_/g, ' ')}</h3>
                  <p className="text-amber-700 text-sm mt-1">{securityData.incidents[0].description}</p>
                </div>
              </motion.div>
            )}

            {activeTab === "portal" && (
              <motion.div key="portal-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {!activeSession ? (
                  <div className="max-w-md mx-auto mt-20">
                    <div className="bg-white p-10 rounded-3xl shadow-soft border border-slate-200 text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-brand"></div>
                      
                      <div className="w-20 h-20 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-primary/10">
                        <KeyRound className="w-10 h-10 text-primary" />
                      </div>
                      
                      <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Access Portal</h2>
                      <p className="text-slate-500 mb-8 font-medium flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" /> End-to-End Encrypted Login
                      </p>
                      
                      <form onSubmit={validateToken} className="space-y-5">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                          </div>
                          <input 
                            type="text"
                            value={tokenInput}
                            onChange={(e) => setTokenInput(e.target.value)}
                            placeholder="Paste E2EE token link..."
                            required
                            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-mono text-xs text-center focus:outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all"
                          />
                        </div>
                        <Button type="submit" className="w-full py-4 text-lg shadow-glow hover:shadow-lg transition-all rounded-2xl bg-gradient-brand" isLoading={isLoading}>
                          Connect Securely
                        </Button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Session Info & Records */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* Premium Session Banner */}
                  <div className="bg-white rounded-3xl shadow-soft border border-slate-200 overflow-hidden relative">
                    <div className="absolute bottom-0 left-0 w-full h-2 bg-slate-100">
                      <div 
                        className={`h-full transition-all duration-1000 ${isExpired ? 'bg-red-500' : 'bg-emerald-500'}`}
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>

                    <div className={`p-8 ${isExpired ? 'bg-red-50/50' : 'bg-gradient-to-r from-white to-slate-50'}`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Secure E2EE Session Active</span>
                          </div>
                          <h3 className="font-extrabold text-2xl text-slate-900 mb-1">
                            {activeSession.patientName}
                          </h3>
                          <p className="text-sm font-mono text-slate-500 bg-white px-2 py-1 rounded inline-block border border-slate-200">
                            ID: {activeSession.token.id.split('-')[0]}
                          </p>
                        </div>

                        <div className={`text-right px-6 py-4 rounded-2xl border ${isExpired ? 'bg-red-100 border-red-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isExpired ? 'text-red-600' : 'text-slate-400'}`}>
                            {isExpired ? "Session Ended" : "Time Remaining"}
                          </p>
                          <p className={`text-3xl font-mono font-extrabold tracking-tight flex items-center gap-2 ${isExpired ? 'text-red-700' : 'text-primary'}`}>
                            <Clock className="w-6 h-6 opacity-50" />
                            {timeRemaining}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Patient Vitals Context */}
                  {patientProfile && (
                    <div className="bg-white rounded-3xl shadow-soft border border-slate-200 p-8 relative">
                      {isExpired && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-3xl"></div>
                      )}
                      <h3 className="font-extrabold text-lg text-slate-900 mb-4 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-500" /> Patient Health Profile (Decrypted)
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Age</p>
                          <p className="font-bold text-slate-900">{patientProfile.age || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Blood Group</p>
                          <p className="font-bold text-slate-900">{patientProfile.blood_group || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Height</p>
                          <p className="font-bold text-slate-900">{patientProfile.height || 'N/A'}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Weight</p>
                          <p className="font-bold text-slate-900">{patientProfile.weight || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-1">Allergies</p>
                          <p className="text-sm font-semibold text-slate-800">{patientProfile.allergies?.join(", ") || 'None reported'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 mb-1">Chronic Diseases</p>
                          <p className="text-sm font-semibold text-slate-800">{patientProfile.chronic_diseases?.join(", ") || 'None reported'}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs font-bold text-slate-500 mb-1">Current Medications</p>
                          <p className="text-sm font-semibold text-slate-800">{patientProfile.current_medications?.join(", ") || 'None reported'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Patient Records List */}
                  <div className="bg-white rounded-3xl shadow-soft border border-slate-200 p-8 relative">
                    {isExpired && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-3xl">
                        <div className="bg-red-50 text-red-700 border border-red-200 px-6 py-4 rounded-2xl font-bold shadow-sm flex items-center gap-3">
                          <LogOut className="w-5 h-5" />
                          Access Revoked Automatically
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-900">Health Records</h2>
                        <p className="text-sm text-slate-500">Encrypted files (Decrypted on click)</p>
                      </div>
                    </div>

                    {patientRecords.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No records available.</p>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {patientRecords.map(r => (
                          <div key={r.id} className="p-4 border border-slate-200 rounded-2xl flex justify-between items-center bg-slate-50 hover:bg-white hover:shadow-soft transition-all group">
                            <div className="flex items-center gap-3 overflow-hidden pr-2">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="truncate">
                                <p className="font-bold text-slate-900 text-sm truncate">{r.file_name}</p>
                                <p className="text-xs text-slate-500 font-medium">{new Date(r.uploaded_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <button onClick={() => handleViewRecord(r)} className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-primary hover:border-primary transition-colors shadow-sm">
                              <Search className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Previous Treatments List */}
                  <div className="bg-white rounded-3xl shadow-soft border border-slate-200 p-8 relative">
                    {isExpired && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 rounded-3xl"></div>
                    )}
                    
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-900">Treatment History</h2>
                        <p className="text-sm text-slate-500">Decrypted past diagnoses</p>
                      </div>
                    </div>

                    {patientTreatments.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No previous treatments recorded.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {patientTreatments.map(t => (
                          <div key={t.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-300"></div>
                            
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-bold text-slate-900">{t.diagnosis}</h3>
                                <p className="text-xs font-semibold text-slate-500 mt-0.5">Dr. {t.profiles?.full_name}</p>
                              </div>
                              <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">
                                {new Date(t.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="text-sm">
                              <div className="mb-2">
                                <span className="font-semibold text-slate-700 block text-xs uppercase tracking-wider mb-1">Prescription</span>
                                <p className="text-slate-600">{t.prescription}</p>
                              </div>
                              {t.notes && (
                                <div>
                                  <span className="font-semibold text-slate-700 block text-xs uppercase tracking-wider mb-1">Notes</span>
                                  <p className="text-slate-600">{t.notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Treatment Form */}
                <div className="bg-white rounded-3xl shadow-soft border border-slate-200 p-8 h-fit relative">
                  {isExpired && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-10 rounded-3xl"></div>
                  )}
                  
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <PenTool className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">Add Notes</h2>
                      <p className="text-sm text-slate-500">Data will be encrypted</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleAddTreatment} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Diagnosis</label>
                      <input 
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-accent transition-all font-medium text-slate-900"
                        value={diagnosis}
                        onChange={(e) => setDiagnosis(e.target.value)}
                        required
                        disabled={isExpired}
                        placeholder="E.g., Viral Fever"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Prescription</label>
                      <textarea 
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-accent transition-all font-medium text-slate-900 resize-none disabled:opacity-50"
                        rows={3}
                        value={prescription}
                        onChange={(e) => setPrescription(e.target.value)}
                        required
                        disabled={isExpired}
                        placeholder="Medications and dosages..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Notes (Optional)</label>
                      <textarea 
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-accent transition-all font-medium text-slate-900 resize-none disabled:opacity-50"
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={isExpired}
                        placeholder="Additional advice or follow-ups..."
                      />
                    </div>

                    <Button type="submit" className="w-full mt-4 py-4 rounded-xl shadow-glow hover:shadow-lg transition-transform hover:-translate-y-0.5 bg-gradient-brand text-white font-bold" isLoading={isSubmitting} disabled={isExpired}>
                      Securely Save
                    </Button>
                  </form>
                </div>
              </div>
            )}
            </motion.div>
            )}

            {activeTab === "activity" && (
              <motion.div key="activity-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="mb-8">
                  <h2 className="text-2xl font-extrabold text-slate-900">Session Activity</h2>
                  <p className="text-slate-500 mt-1">A timeline of your recent actions on the platform.</p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                  {doctorLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-slate-500 font-medium">No activity recorded yet.</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
                      {doctorLogs.map((log) => {
                        const isDanger = ['UNAUTHORIZED_ACCESS', 'INVALID_TOKEN'].includes(log.action);
                        const isWarning = ['SESSION_EXPIRED'].includes(log.action);
                        
                        let badgeClass = "bg-blue-100 text-blue-700";
                        if (isDanger) badgeClass = "bg-red-100 text-red-700";
                        else if (isWarning) badgeClass = "bg-amber-100 text-amber-700";
                        else if (log.action.includes('TREATMENT')) badgeClass = "bg-emerald-100 text-emerald-700";

                        return (
                          <div key={log.id} className="relative pl-8">
                            <span className={`absolute -left-[11px] top-1.5 w-5 h-5 rounded-full border-4 border-white ${
                              isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary"
                            }`}></span>
                            
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:shadow-soft transition-all">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                    {log.action.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-slate-400">
                                  {new Date(log.created_at).toLocaleString()}
                                </span>
                              </div>
                              
                              <p className="text-slate-800 font-medium text-sm mt-3">{log.metadata?.description}</p>
                              
                              <div className="mt-3 flex gap-4 text-xs font-medium text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-100 inline-flex">
                                {log.patient?.full_name && (
                                  <span><strong className="text-slate-700">Patient:</strong> {log.patient.full_name}</span>
                                )}
                                <span><strong className="text-slate-700">Token ID:</strong> {log.token_id?.split('-')[0] || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
