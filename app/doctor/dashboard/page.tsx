"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { 
  Activity, User, LogOut, KeyRound, 
  FileText, Clock, PenTool, Search, LayoutDashboard, History, Heart, ShieldCheck, Upload, Plus
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
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<any>({});
  const [languagesInput, setLanguagesInput] = useState("");
  const [specializationInput, setSpecializationInput] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
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
    fetchDoctorProfile(session.user.id);
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

  const fetchDoctorProfile = async (doctorId: string) => {
    try {
      const res = await fetch(`/api/doctor/profile?doctorId=${doctorId}`);
      const data = await res.json();
      if (data.profile) {
        setDoctorProfile(data.profile);
        setProfileForm(data.profile);
        setLanguagesInput(data.profile.languages_spoken?.join(", ") || "");
        setSpecializations(data.profile.specialization ? data.profile.specialization.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
      }
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

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading("Saving profile...");
    
    try {
      const res = await fetch("/api/doctor/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctor_id: user.id,
          ...profileForm,
          languages_spoken: languagesInput.split(",").map(s => s.trim()).filter(Boolean),
          specialization: specializations.join(", ")
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDoctorProfile(data.profile);
      setIsEditingProfile(false);
      toast.success("Profile updated!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const toastId = toast.loading("Uploading photo...");

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/profile-${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('doctor-profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('doctor-profiles')
        .getPublicUrl(filePath);

      setProfileForm({ ...profileForm, profile_photo_url: publicUrl });
      toast.success("Photo uploaded!", { id: toastId });
    } catch (err) {
      toast.error("Upload failed", { id: toastId });
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
          <div 
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-3 p-3 mb-6 rounded-2xl border cursor-pointer transition-all ${
              activeTab === "profile" 
                ? "bg-primary/5 border-primary/20 shadow-sm" 
                : "bg-slate-50 border-slate-100 hover:bg-slate-100"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${doctorProfile?.profile_photo_url ? 'bg-slate-100' : 'bg-accent/10 text-accent'}`}>
              {doctorProfile?.profile_photo_url ? (
                <img src={doctorProfile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div className="overflow-hidden flex-1">
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
                  <div className="space-y-8">
                    <div className="mb-4">
                      <h2 className="text-2xl font-extrabold text-slate-900">Dashboard Overview</h2>
                      <p className="text-slate-500 mt-1">Welcome back, Dr. {profile?.full_name}. Here's your summary.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4">
                          <User className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {new Set(doctorLogs.filter(l => l.action === 'TREATMENT_ADDED').map(l => l.patient?.id)).size}
                        </h3>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1 text-[10px]">Patients Treated</p>
                      </div>
                      
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4">
                          <Activity className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {doctorLogs.filter(l => l.action === 'TREATMENT_ADDED').length}
                        </h3>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1 text-[10px]">Consultations</p>
                      </div>
                      
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-4">
                          <History className="w-5 h-5" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">
                          {doctorLogs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}
                        </h3>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1 text-[10px]">Today's Activity</p>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 truncate">
                          {doctorProfile?.specialization || "General"}
                        </h3>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1 text-[10px]">Specialization</p>
                      </div>
                    </div>

                    <div className="max-w-md mx-auto mt-12">
                      <div className="bg-white p-10 rounded-3xl shadow-soft border border-slate-200 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-brand"></div>
                        
                        <div className="w-20 h-20 bg-primary/5 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-primary/10">
                          <KeyRound className="w-10 h-10 text-primary" />
                        </div>
                        
                        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Access Portal</h2>
                        <p className="text-slate-500 mb-8 font-medium flex items-center justify-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary" /> Secure Access Login
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
                              placeholder="Paste access token..."
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

            {activeTab === "profile" && (
              <motion.div key="profile-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">Professional Profile</h2>
                    <p className="text-slate-500 mt-1">Manage your medical identity and credentials.</p>
                  </div>
                  {!isEditingProfile && (
                    <Button onClick={() => setIsEditingProfile(true)} className="bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-primary">
                      Edit Profile
                    </Button>
                  )}
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  {!isEditingProfile ? (
                    <div className="p-8">
                      {doctorProfile ? (
                        <div className="grid md:grid-cols-3 gap-8">
                          <div className="md:col-span-1 border-r border-slate-100 pr-8">
                            <div className="text-center">
                              <div className="w-32 h-32 mx-auto bg-slate-100 rounded-full flex items-center justify-center overflow-hidden mb-4 border-4 border-white shadow-sm">
                                {doctorProfile.profile_photo_url ? (
                                  <img src={doctorProfile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-12 h-12 text-slate-300" />
                                )}
                              </div>
                              <h3 className="text-xl font-bold text-slate-900">Dr. {profile?.full_name}</h3>
                              <p className="text-primary font-semibold text-sm mb-2">{doctorProfile.specialization || "General Physician"}</p>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">
                                <ShieldCheck className="w-3.5 h-3.5" /> Verified Medical Professional
                              </div>
                            </div>

                            <div className="mt-8 space-y-4">
                              <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Experience</p>
                                <p className="text-sm font-semibold text-slate-800">{doctorProfile.experience_years || "Not specified"}</p>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Registration No.</p>
                                <p className="text-sm font-mono text-slate-800">{doctorProfile.medical_license || "Not specified"}</p>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Languages</p>
                                <p className="text-sm font-semibold text-slate-800">{doctorProfile.languages_spoken?.join(", ") || "Not specified"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-2 space-y-8">
                            <section>
                              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">About & Qualifications</h4>
                              {doctorProfile.bio && <p className="text-slate-600 text-sm mb-4 leading-relaxed">{doctorProfile.bio}</p>}
                              
                              <div className="grid sm:grid-cols-2 gap-6">
                                <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Primary Qualification</p>
                                  <p className="text-sm font-semibold text-slate-800">{doctorProfile.medical_qualification || "Not specified"}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Additional Degrees</p>
                                  <p className="text-sm font-semibold text-slate-800">{doctorProfile.degrees?.join(", ") || "None"}</p>
                                </div>
                              </div>
                            </section>

                            <section>
                              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Clinic / Hospital Details</h4>
                              <div className="grid sm:grid-cols-2 gap-6">
                                <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Hospital Name</p>
                                  <p className="text-sm font-semibold text-slate-800">{doctorProfile.hospital_name || "Not specified"}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Working Hours</p>
                                  <p className="text-sm font-semibold text-slate-800">{doctorProfile.working_hours || "Not specified"}</p>
                                </div>
                                <div className="sm:col-span-2">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Address</p>
                                  <p className="text-sm font-semibold text-slate-800">{doctorProfile.hospital_address || "Not specified"}</p>
                                </div>
                              </div>
                            </section>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <h3 className="text-lg font-bold text-slate-900 mb-2">Profile Not Set Up</h3>
                          <p className="text-slate-500 mb-6 max-w-md mx-auto">You haven't completed your professional profile yet. A complete profile helps build trust with patients.</p>
                          <Button onClick={() => setIsEditingProfile(true)} className="bg-primary text-white">Create Profile</Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={handleProfileSave} className="p-8">
                      <div className="space-y-8 max-w-3xl mx-auto">
                        
                        {/* Photo Upload Section */}
                        <div className="flex items-center gap-6 pb-6 border-b border-slate-100">
                          <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-200">
                            {profileForm.profile_photo_url ? (
                              <img src={profileForm.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-10 h-10 text-slate-300" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 mb-1">Profile Photo</h4>
                            <p className="text-xs text-slate-500 mb-3">Upload a professional image to build trust with your patients.</p>
                            <input type="file" id="photo-upload" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                            <label htmlFor="photo-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors">
                              <Upload className="w-4 h-4" /> Choose Image
                            </label>
                          </div>
                        </div>

                        {/* Professional Identity */}
                        <div className="space-y-5">
                          <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Professional Identity</h4>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Specializations</label>
                              <div className="flex gap-2 mb-2">
                                <select className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-primary outline-none"
                                  value={specializationInput} onChange={(e) => setSpecializationInput(e.target.value)}>
                                  <option value="">Select Speciality</option>
                                  <option value="Cardiologist">Cardiologist</option>
                                  <option value="Neurologist">Neurologist</option>
                                  <option value="Dermatologist">Dermatologist</option>
                                  <option value="Pediatrician">Pediatrician</option>
                                  <option value="Orthopedic">Orthopedic</option>
                                  <option value="General Physician">General Physician</option>
                                  <option value="Other">Other (Type below)</option>
                                </select>
                                <Button type="button" onClick={() => {
                                  if (specializationInput && !specializations.includes(specializationInput)) {
                                    setSpecializations([...specializations, specializationInput]);
                                    setSpecializationInput("");
                                  }
                                }} className="bg-primary text-white px-3"><Plus className="w-5 h-5"/></Button>
                              </div>
                              {specializationInput === "Other" && (
                                <div className="flex gap-2 mb-2 mt-2">
                                  <input type="text" id="custom-spec" className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:border-primary outline-none" placeholder="Enter custom speciality" />
                                  <Button type="button" onClick={() => {
                                    const val = (document.getElementById("custom-spec") as HTMLInputElement).value;
                                    if (val && !specializations.includes(val)) {
                                      setSpecializations([...specializations, val]);
                                      (document.getElementById("custom-spec") as HTMLInputElement).value = "";
                                    }
                                  }} className="bg-primary text-white px-3"><Plus className="w-5 h-5"/></Button>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {specializations.map((spec, idx) => (
                                  <span key={idx} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                                    {spec}
                                    <button type="button" onClick={() => setSpecializations(specializations.filter((_, i) => i !== idx))} className="hover:text-red-500 ml-1">&times;</button>
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Registration No.</label>
                              <input type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                                value={profileForm.medical_license || ""} onChange={(e) => setProfileForm({...profileForm, medical_license: e.target.value})} placeholder="E.g., MCI-12345" />
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Primary Qualification</label>
                              <input type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                                value={profileForm.medical_qualification || ""} onChange={(e) => setProfileForm({...profileForm, medical_qualification: e.target.value})} placeholder="E.g., MBBS, MD" />
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Experience</label>
                              <select className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                value={profileForm.experience_years || ""} onChange={(e) => setProfileForm({...profileForm, experience_years: e.target.value})}>
                                <option value="">Select</option>
                                <option value="New to field">New to field</option>
                                <option value="1-3 years">1-3 years</option>
                                <option value="3-5 years">3-5 years</option>
                                <option value="5-10 years">5-10 years</option>
                                <option value="10+ years">10+ years</option>
                              </select>
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Professional Bio</label>
                              <textarea className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none" rows={3}
                                value={profileForm.bio || ""} onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})} placeholder="Brief overview of your expertise..."></textarea>
                            </div>
                          </div>
                        </div>

                        {/* Clinic & Contact Details */}
                        <div className="space-y-5">
                          <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">Clinic & Contact Details</h4>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Hospital / Clinic Name</label>
                              <input type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                                value={profileForm.hospital_name || ""} onChange={(e) => setProfileForm({...profileForm, hospital_name: e.target.value})} placeholder="E.g., City General Hospital" />
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Working Hours</label>
                              <select className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                value={profileForm.working_hours || ""} onChange={(e) => setProfileForm({...profileForm, working_hours: e.target.value})}>
                                <option value="">Select Working Hours</option>
                                <option value="Morning Shift (8 AM - 2 PM)">Morning Shift (8 AM - 2 PM)</option>
                                <option value="Evening Shift (2 PM - 8 PM)">Evening Shift (2 PM - 8 PM)</option>
                                <option value="Night Shift (8 PM - 8 AM)">Night Shift (8 PM - 8 AM)</option>
                                <option value="Full Day (9 AM - 5 PM)">Full Day (9 AM - 5 PM)</option>
                                <option value="Flexible / On Call">Flexible / On Call</option>
                              </select>
                            </div>

                            <div className="col-span-2">
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Address</label>
                              <input type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                                value={profileForm.hospital_address || ""} onChange={(e) => setProfileForm({...profileForm, hospital_address: e.target.value})} placeholder="Full address" />
                            </div>
                            
                            <div className="col-span-2">
                              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Languages Spoken (comma separated)</label>
                              <input type="text" className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                                value={languagesInput} 
                                onChange={(e) => setLanguagesInput(e.target.value)} 
                                placeholder="E.g., English, Spanish, Hindi" />
                            </div>
                          </div>
                        </div>

                      </div>

                      <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <Button type="button" variant="secondary" onClick={() => {setIsEditingProfile(false); setProfileForm(doctorProfile || {});}}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting} className="bg-primary text-white">Save Professional Profile</Button>
                      </div>
                    </form>
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
