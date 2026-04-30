"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { 
  FileText, Key, Clock, Activity, LogOut, 
  Upload, Trash2, Eye, ShieldCheck, User, LayoutDashboard, Heart, History, Pill, Search, Plus
} from "lucide-react";

export default function PatientDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Data states
  const [healthProfile, setHealthProfile] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // E2EE states
  // Form states
  const [duration, setDuration] = useState(1);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState("General Document");

  // Profile Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    age: "", gender: "", blood_group: "", height: "", weight: "", emergency_contact: "",
    allergies: "", chronic_diseases: "", past_surgeries: "", family_history: ""
  });
  const [currentMedications, setCurrentMedications] = useState<string[]>([]);

  const [activeRecordCategory, setActiveRecordCategory] = useState("All");

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login?role=patient");
      return;
    }
    setUser(session.user);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileData?.role !== "patient") {
      router.push("/login?role=patient");
      return;
    }
    
    setProfile(profileData);
    fetchData(session.user.id);
  };

  const fetchData = async (userId: string) => {
    setIsLoading(true);
    try {
      const [recordsRes, tokensRes, treatmentsRes, auditRes, profileRes] = await Promise.all([
        supabase.from("health_records").select("*").eq("patient_id", userId).order("uploaded_at", { ascending: false }),
        supabase.from("access_tokens").select("*").eq("patient_id", userId).order("created_at", { ascending: false }),
        supabase.from("treatment_details").select("*, profiles!doctor_id(full_name)").eq("patient_id", userId).order("created_at", { ascending: false }),
        fetch(`/api/audit?patientId=${userId}`).then(res => res.json()),
        fetch(`/api/patient/profile?patientId=${userId}`).then(res => res.json())
      ]);

      setRecords(recordsRes.data || []);
      setTokens(tokensRes.data || []);
      setTreatments(treatmentsRes.data || []);

      if (auditRes.logs) setAuditLogs(auditRes.logs);

      if (profileRes.profile) {
        const p = profileRes.profile;
        setHealthProfile(p);
        setProfileForm({
          age: p.age || "",
          gender: p.gender || "",
          blood_group: p.blood_group || "",
          height: p.height || "",
          weight: p.weight || "",
          emergency_contact: p.emergency_contact || "",
          allergies: p.allergies?.join(", ") || "",
          chronic_diseases: p.chronic_diseases?.join(", ") || "",
          past_surgeries: p.past_surgeries?.join(", ") || "",
          family_history: p.family_history || "",
        });
        setCurrentMedications(p.current_medications || []);
      }
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const saveHealthProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading("Saving profile...");
    
    try {
      const payload = {
        patient_id: user.id,
        age: parseInt(profileForm.age as string) || null,
        gender: profileForm.gender,
        blood_group: profileForm.blood_group,
        height: profileForm.height,
        weight: profileForm.weight,
        emergency_contact: profileForm.emergency_contact,
        allergies: profileForm.allergies.split(",").map((s: string) => s.trim()).filter(Boolean),
        chronic_diseases: profileForm.chronic_diseases.split(",").map((s: string) => s.trim()).filter(Boolean),
        current_medications: currentMedications.map((s: string) => s.trim()).filter(Boolean),
        past_surgeries: profileForm.past_surgeries.split(",").map((s: string) => s.trim()).filter(Boolean),
        family_history: profileForm.family_history
      };

      const res = await fetch("/api/patient/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      
      toast.success("Health profile updated!", { id: toastId });
      setIsEditingProfile(false);
      fetchData(user.id);
    } catch (err) {
      toast.error("Failed to update profile", { id: toastId });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    router.push("/");
  };

  const refreshTokens = async (userId: string) => {
    const { data } = await supabase
      .from("access_tokens")
      .select("*")
      .eq("patient_id", userId)
      .order("created_at", { ascending: false });
    if (data) setTokens(data);
  };

  const generateToken = async () => {
    const toastId = toast.loading("Generating token...");
    try {
      const res = await fetch("/api/access/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: user.id, durationHours: duration })
      });
      const data = await res.json();
      if (data.token) {
        const fullToken = data.token.token;
        setNewToken(fullToken);
        await refreshTokens(user.id);
        toast.success("Access granted", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate token", { id: toastId });
    }
  };

  const revokeToken = async (tokenId: string) => {
    const toastId = toast.loading("Revoking access...");
    try {
      await fetch("/api/access/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, patientId: user.id })
      });
      await refreshTokens(user.id);
      toast.success("Access revoked", { id: toastId });
    } catch (err) {
      toast.error("Failed to revoke token", { id: toastId });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    const toastId = toast.loading("Uploading file...");

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('health-records')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('health-records')
        .getPublicUrl(filePath);

      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: user.id,
          fileUrl: publicUrl,
          fileName: file.name,
          fileType: fileExt,
          category: uploadCategory
        })
      });
        
        if (!res.ok) throw new Error();
        fetchData(user.id);
        toast.success("File uploaded", { id: toastId });
    } catch (err) {
        toast.error("Upload failed", { id: toastId });
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "timeline", label: "Health Timeline", icon: History },
    { id: "records", label: "Smart Records", icon: FileText },
    { id: "access", label: "Grant Access", icon: ShieldCheck },
    { id: "sessions", label: "Active Sessions", icon: Key },
    { id: "transparency", label: "Access Transparency", icon: Eye },
  ];

  const activeTokensCount = tokens.filter(t => !t.revoked && !t.used_at && new Date() <= new Date(t.expires_at)).length;

  const timelineEvents = [
    ...treatments.map(t => ({ ...t, type: 'treatment', date: t.created_at })),
    ...records.map(r => ({ ...r, type: 'record', date: r.uploaded_at }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredRecords = activeRecordCategory === "All" ? records : records.filter(r => r.category === activeRecordCategory);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 z-20 overflow-y-auto">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 sticky top-0 bg-white">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center mr-3">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-lg text-slate-900">Secure<span className="text-primary">EHR</span></span>
        </div>
        
        <div className="p-4 pb-20">
          <div className="flex items-center gap-3 p-3 mb-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{profile.full_name}</p>
              <p className="text-xs text-slate-500">Patient Dashboard</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    isActive 
                      ? "bg-primary text-white shadow-md shadow-primary/20" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="fixed md:absolute bottom-0 md:bottom-4 left-0 md:left-4 right-0 md:right-4 p-4 md:p-0 bg-white md:bg-transparent border-t md:border-t-0 border-slate-200">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 rounded-xl hover:bg-red-50 transition-colors bg-white md:bg-transparent"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 h-screen overflow-y-auto relative bg-slate-50/50">
        <div className="max-w-5xl mx-auto p-6 lg:p-10 pb-24">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-extrabold text-slate-900">Welcome, {profile.full_name}</h2>
                    <p className="text-slate-500 mt-1 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> Patient Portal
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div 
                      onClick={() => setActiveTab("records")} 
                      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center cursor-pointer hover:shadow-md transition-shadow group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <p className="text-3xl font-extrabold text-slate-900">{records.length}</p>
                      <p className="text-sm font-semibold text-slate-500 mt-1 flex items-center justify-between">
                        Total Records <Search className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                      </p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                        <Activity className="w-5 h-5" />
                      </div>
                      <p className="text-3xl font-extrabold text-slate-900">{treatments.length}</p>
                      <p className="text-sm font-semibold text-slate-500 mt-1">Consultations</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                        <Pill className="w-5 h-5" />
                      </div>
                      <p className="text-3xl font-extrabold text-slate-900">{healthProfile?.current_medications?.length || 0}</p>
                      <p className="text-sm font-semibold text-slate-500 mt-1">Active Medications</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-center">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <p className="text-3xl font-extrabold text-slate-900">{activeTokensCount}</p>
                      <p className="text-sm font-semibold text-slate-500 mt-1">Active Sessions</p>
                    </div>
                  </div>

                  <div className="space-y-6 mt-12 pt-8 border-t border-slate-200">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                          <Heart className="w-6 h-6 text-red-500" /> Personal Health Profile
                        </h2>
                        <p className="text-slate-500 mt-1">Your core medical identity.</p>
                      </div>
                      {!isEditingProfile && (
                        <Button onClick={() => setIsEditingProfile(true)} className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
                          Edit Profile
                        </Button>
                      )}
                    </div>

                    {!isEditingProfile ? (
                      <div className="bg-white rounded-3xl shadow-soft border border-slate-200 overflow-hidden">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-6">
                          <div className="w-20 h-20 rounded-2xl bg-gradient-brand text-white flex items-center justify-center shadow-inner text-3xl font-bold">
                            {profile.full_name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-2xl font-extrabold text-slate-900">{profile.full_name}</h3>
                            <p className="text-slate-500 font-medium mt-1">{healthProfile?.age ? `${healthProfile.age} yrs` : 'Age unknown'} • {healthProfile?.gender || 'Gender not specified'}</p>
                          </div>
                        </div>
                        
                        <div className="p-8 grid sm:grid-cols-2 gap-8">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Vitals & Basics</h4>
                            <div className="space-y-4">
                              <div><span className="block text-xs font-semibold text-slate-500">Blood Group</span><span className="font-bold text-slate-900">{healthProfile?.blood_group || '-'}</span></div>
                              <div><span className="block text-xs font-semibold text-slate-500">Height</span><span className="font-bold text-slate-900">{healthProfile?.height || '-'}</span></div>
                              <div><span className="block text-xs font-semibold text-slate-500">Weight</span><span className="font-bold text-slate-900">{healthProfile?.weight || '-'}</span></div>
                              <div><span className="block text-xs font-semibold text-slate-500">Emergency Contact</span><span className="font-bold text-slate-900">{healthProfile?.emergency_contact || '-'}</span></div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Medical Details</h4>
                            <div className="space-y-4">
                              <div><span className="block text-xs font-semibold text-slate-500">Allergies</span><span className="font-bold text-slate-900">{healthProfile?.allergies?.join(", ") || 'None'}</span></div>
                              <div><span className="block text-xs font-semibold text-slate-500">Chronic Diseases</span><span className="font-bold text-slate-900">{healthProfile?.chronic_diseases?.join(", ") || 'None'}</span></div>
                              <div><span className="block text-xs font-semibold text-slate-500">Current Medications</span><span className="font-bold text-slate-900">{healthProfile?.current_medications?.join(", ") || 'None'}</span></div>
                              <div><span className="block text-xs font-semibold text-slate-500">Past Surgeries</span><span className="font-bold text-slate-900">{healthProfile?.past_surgeries?.join(", ") || 'None'}</span></div>
                            </div>
                          </div>
                          <div className="sm:col-span-2">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Family History</h4>
                            <p className="font-medium text-slate-800">{healthProfile?.family_history || 'Not specified'}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={saveHealthProfile} className="bg-white rounded-3xl shadow-soft border border-slate-200 p-8">
                        <div className="grid sm:grid-cols-2 gap-6">
                          <Input label="Age" type="number" value={profileForm.age} onChange={e => setProfileForm({...profileForm, age: e.target.value})} />
                          
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Gender</label>
                            <select 
                              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-primary transition-all font-medium text-slate-900"
                              value={profileForm.gender} 
                              onChange={e => setProfileForm({...profileForm, gender: e.target.value})}
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                              <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Blood Group</label>
                            <select 
                              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-primary transition-all font-medium text-slate-900"
                              value={profileForm.blood_group} 
                              onChange={e => setProfileForm({...profileForm, blood_group: e.target.value})}
                            >
                              <option value="">Select Blood Group</option>
                              <option value="A+">A+</option>
                              <option value="A-">A-</option>
                              <option value="B+">B+</option>
                              <option value="B-">B-</option>
                              <option value="AB+">AB+</option>
                              <option value="AB-">AB-</option>
                              <option value="O+">O+</option>
                              <option value="O-">O-</option>
                            </select>
                          </div>

                          <Input label="Height" value={profileForm.height} onChange={e => setProfileForm({...profileForm, height: e.target.value})} placeholder="e.g. 180cm" />
                          <Input label="Weight" value={profileForm.weight} onChange={e => setProfileForm({...profileForm, weight: e.target.value})} placeholder="e.g. 75kg" />
                          <Input label="Emergency Contact" value={profileForm.emergency_contact} onChange={e => setProfileForm({...profileForm, emergency_contact: e.target.value})} placeholder="Name & Phone" />
                          <Input label="Allergies (comma separated)" value={profileForm.allergies} onChange={e => setProfileForm({...profileForm, allergies: e.target.value})} placeholder="e.g. Peanuts, Penicillin" />
                          <Input label="Chronic Diseases" value={profileForm.chronic_diseases} onChange={e => setProfileForm({...profileForm, chronic_diseases: e.target.value})} placeholder="e.g. Diabetes, Asthma" />
                          <Input label="Past Surgeries" value={profileForm.past_surgeries} onChange={e => setProfileForm({...profileForm, past_surgeries: e.target.value})} placeholder="e.g. Appendectomy 2010" />
                          
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Current Medications</label>
                            {currentMedications.map((med, idx) => (
                              <div key={idx} className="flex gap-2 mb-2">
                                <div className="flex-1">
                                  <Input 
                                    label=""
                                    value={med} 
                                    onChange={e => {
                                      const newMeds = [...currentMedications];
                                      newMeds[idx] = e.target.value;
                                      setCurrentMedications(newMeds);
                                    }} 
                                    placeholder="e.g. Metformin 500mg" 
                                  />
                                </div>
                                <Button 
                                  type="button" 
                                  variant="secondary" 
                                  className="px-3" 
                                  onClick={() => {
                                    const newMeds = [...currentMedications];
                                    newMeds.splice(idx, 1);
                                    setCurrentMedications(newMeds);
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 text-red-500"/>
                                </Button>
                              </div>
                            ))}
                            <Button 
                              type="button" 
                              variant="secondary" 
                              className="w-full flex items-center justify-center gap-2 mt-2" 
                              onClick={() => setCurrentMedications([...currentMedications, ""])}
                            >
                              <Plus className="w-4 h-4"/> Add Medication
                            </Button>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Family History</label>
                            <textarea 
                              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-primary transition-all font-medium text-slate-900"
                              rows={3}
                              value={profileForm.family_history}
                              onChange={e => setProfileForm({...profileForm, family_history: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="flex gap-4 mt-8 justify-end">
                          <Button type="button" variant="secondary" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
                          <Button type="submit" className="bg-primary text-white">Save Changes</Button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "timeline" && (
                <div>
                  <div className="mb-8">
                    <h2 className="text-2xl font-extrabold text-slate-900">Health Timeline</h2>
                    <p className="text-slate-500 mt-1">Your complete medical journey.</p>
                  </div>

                  <div className="relative border-l-2 border-primary/20 ml-6 pl-8 space-y-10 pb-8">
                    {timelineEvents.length === 0 ? (
                      <p className="text-slate-500">No events found.</p>
                    ) : timelineEvents.map((event, idx) => (
                      <div key={idx} className="relative group">
                        <span className={`absolute -left-[41px] top-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center text-white shadow-sm ${
                          event.type === 'treatment' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}>
                          {event.type === 'treatment' ? <Activity className="w-3 h-3"/> : <FileText className="w-3 h-3"/>}
                        </span>
                        
                        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group-hover:-translate-y-1 duration-300">
                          <span className="text-xs font-bold text-slate-400 block mb-2">{new Date(event.date).toLocaleDateString()} at {new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          {event.type === 'treatment' ? (
                            <div>
                              <h3 className="text-xl font-extrabold text-slate-900 mb-1">{event.diagnosis}</h3>
                              <p className="text-sm font-semibold text-primary mb-4">Consultation with Dr. {event.profiles?.full_name}</p>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-3">
                                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Prescription</span>
                                <p className="text-slate-800 font-medium">{event.prescription}</p>
                              </div>
                              {event.notes && (
                                <p className="text-sm text-slate-600"><strong className="text-slate-700">Notes:</strong> {event.notes}</p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <h3 className="text-lg font-bold text-slate-900 mb-1">Uploaded {event.category}</h3>
                              <p className="text-slate-600 font-medium mb-3">{event.file_name}</p>
                              <a href={event.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors bg-primary/5 px-4 py-2 rounded-lg">
                                <Search className="w-4 h-4"/> View Document
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "records" && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900">Smart Records</h2>
                      <p className="text-slate-500 mt-1">Organized medical documents.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                      <select 
                        value={uploadCategory} 
                        onChange={e => setUploadCategory(e.target.value)}
                        className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-primary"
                      >
                        <option value="General Document">General Document</option>
                        <option value="Lab Report">Lab Report</option>
                        <option value="Prescription">Prescription</option>
                        <option value="Scan/Imaging">Scan/Imaging</option>
                      </select>
                      <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} />
                      <label htmlFor="file-upload" className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 cursor-pointer transition-transform hover:-translate-y-0.5 whitespace-nowrap">
                        <Upload className="w-4 h-4" />
                        Upload
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                    {["All", "Lab Report", "Prescription", "Scan/Imaging", "General Document"].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => setActiveRecordCategory(cat)}
                        className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${
                          activeRecordCategory === cat ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {filteredRecords.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center bg-white/50">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <FileText className="w-8 h-8 text-slate-300" />
                      </div>
                      <h3 className="font-bold text-slate-900 mb-1">No {activeRecordCategory !== 'All' ? activeRecordCategory.toLowerCase() + 's' : 'records'} found</h3>
                      <p className="text-sm text-slate-500">Upload documents to store them.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredRecords.map(r => (
                        <div key={r.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                              <FileText className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded">
                              {r.category || 'General Document'}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 truncate mb-1" title={r.file_name}>{r.file_name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-auto pt-4 border-t border-slate-50">
                            <Clock className="w-3 h-3" /> {new Date(r.uploaded_at).toLocaleDateString()}
                          </p>
                          
                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <a href={r.file_url} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-sm hover:scale-110 transition-transform">
                              <Eye className="w-4 h-4" />
                            </a>
                            <button className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shadow-sm hover:scale-110 transition-transform">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Grant Access Tab */}
              {activeTab === "access" && (
                <div className="max-w-2xl">
                  <div className="mb-8">
                    <h2 className="text-2xl font-extrabold text-slate-900">Grant Access</h2>
                    <p className="text-slate-500 mt-1">Generate a time-limited token with an embedded encryption key wrapper.</p>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-soft">
                    <div className="flex flex-col sm:flex-row items-end gap-4 mb-8">
                      <div className="flex-1 w-full">
                        <Input 
                          label="Session Duration (Hours)" 
                          type="number" 
                          min="1" max="72"
                          value={duration}
                          onChange={(e) => setDuration(parseInt(e.target.value))}
                          className="bg-slate-50"
                        />
                      </div>
                      <Button onClick={generateToken} className="w-full sm:w-auto px-8 py-2.5 bg-gradient-brand text-white font-semibold rounded-xl shadow-glow hover:shadow-lg transition-all">
                        Generate Secure Token
                      </Button>
                    </div>

                    {newToken && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-8 bg-slate-50 border border-slate-200 rounded-3xl flex flex-col items-center text-center"
                      >
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-inner">
                          <ShieldCheck className="w-8 h-8" />
                        </div>
                        <h3 className="font-extrabold text-xl text-slate-900 mb-2">Secure E2EE Link Created</h3>
                        <p className="text-sm text-slate-600 mb-8 max-w-sm">
                          Share this with your doctor. It contains an <strong>embedded symmetric encryption key</strong> that allows the doctor to decrypt your records only during this session.
                        </p>
                        
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6">
                          <QRCodeSVG value={newToken} size={180} />
                        </div>
                        
                        <div className="w-full relative group">
                          <div className="w-full bg-white p-4 rounded-xl border border-slate-200 font-mono text-xs break-all shadow-inner text-slate-700 font-medium">
                            {newToken}
                          </div>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(newToken);
                              toast.success("Copied to clipboard!");
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-200"
                          >
                            Copy
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {/* Sessions Tab */}
              {activeTab === "sessions" && (
                <div>
                  <div className="mb-8">
                    <h2 className="text-2xl font-extrabold text-slate-900">Active Sessions</h2>
                    <p className="text-slate-500 mt-1">Manage and revoke doctor access.</p>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr className="text-xs uppercase tracking-widest text-slate-500 font-bold">
                            <th className="p-5">Generated</th>
                            <th className="p-5">Expires</th>
                            <th className="p-5">Status</th>
                            <th className="p-5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tokens.map(token => {
                            const isExpired = new Date() > new Date(token.expires_at);
                            const isUsed = !!token.used_at;
                            const isRevoked = token.revoked;
                            const isActive = !isRevoked && !isExpired;
                            
                            let statusLabel = "READY";
                            let statusClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                            if (isRevoked) { statusLabel = "REVOKED"; statusClass = "bg-slate-100 text-slate-600 border-slate-200"; }
                            else if (isExpired) { statusLabel = "EXPIRED"; statusClass = "bg-amber-50 text-amber-700 border-amber-200"; }
                            else if (isUsed) { statusLabel = "USED"; statusClass = "bg-blue-50 text-blue-700 border-blue-200"; }

                            return (
                              <tr key={token.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-5 text-sm font-semibold text-slate-900 whitespace-nowrap">{new Date(token.created_at).toLocaleString()}</td>
                                <td className="p-5 text-sm text-slate-500 font-medium whitespace-nowrap">{new Date(token.expires_at).toLocaleString()}</td>
                                <td className="p-5">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border whitespace-nowrap ${statusClass}`}>
                                    {isActive && !isUsed && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                                    {statusLabel}
                                  </span>
                                </td>
                                <td className="p-5 text-right">
                                  {isActive && !isUsed && (
                                    <button onClick={() => revokeToken(token.id)} className="text-red-600 hover:text-red-800 text-sm font-bold bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors">
                                      Revoke
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Transparency Tab */}
              {activeTab === "transparency" && (
                <div>
                  <div className="mb-8">
                    <h2 className="text-2xl font-extrabold text-slate-900">Access Transparency</h2>
                    <p className="text-slate-500 mt-1">A complete audit trail of all activity regarding your records.</p>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                    {auditLogs.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-slate-500 font-medium">No activity recorded yet.</p>
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
                        {auditLogs.map((log) => {
                          const isSuccess = !['UNAUTHORIZED_ACCESS', 'INVALID_TOKEN'].includes(log.action);
                          const isWarning = ['TOKEN_REVOKED', 'SESSION_EXPIRED'].includes(log.action);
                          const isDanger = ['UNAUTHORIZED_ACCESS', 'INVALID_TOKEN'].includes(log.action);
                          
                          let badgeClass = "bg-slate-100 text-slate-700";
                          if (isDanger) badgeClass = "bg-red-100 text-red-700";
                          else if (isWarning) badgeClass = "bg-amber-100 text-amber-700";
                          else if (isSuccess && log.action.includes('LOGIN')) badgeClass = "bg-blue-100 text-blue-700";
                          else if (isSuccess) badgeClass = "bg-emerald-100 text-emerald-700";

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
                                
                                <div className="mt-3 flex gap-4 text-xs font-medium text-slate-500 bg-white px-3 py-2 rounded-lg border border-slate-100 inline-flex flex-wrap">
                                  <span><strong className="text-slate-700">Actor:</strong> {log.actor?.full_name || log.actor_id?.split('-')[0]} ({log.actor_role})</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
