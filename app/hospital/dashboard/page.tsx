"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { 
  Building2, Users, Calendar, Activity,
  Search, ShieldCheck, Heart, UserPlus, Clock, ArrowRight, User
} from "lucide-react";

export default function HospitalDashboard() {
  const [activeTab, setActiveTab] = useState("management");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Local state for admissions/appointments to avoid modifying the database schema
  const [appointments, setAppointments] = useState<any[]>([]);
  
  // Form state
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetchUsers();
    // Load local appointments if available
    const saved = localStorage.getItem("hospital_appointments");
    if (saved) {
      setAppointments(JSON.parse(saved));
    }
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*");
        
      if (error) throw error;
      
      setDoctors(data.filter(u => u.role === "doctor"));
      setPatients(data.filter(u => u.role === "patient"));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load directory");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !selectedDoctor || !selectedDate || !selectedTime) {
      toast.error("Please fill all required fields");
      return;
    }

    const patient = patients.find(p => p.id === selectedPatient);
    const doctor = doctors.find(d => d.id === selectedDoctor);

    const newAppointment = {
      id: Math.random().toString(36).substr(2, 9),
      patientId: selectedPatient,
      patientName: patient?.full_name,
      doctorId: selectedDoctor,
      doctorName: doctor?.full_name,
      date: selectedDate,
      time: selectedTime,
      reason: reason,
      status: "Scheduled",
      createdAt: new Date().toISOString()
    };

    const updated = [newAppointment, ...appointments];
    setAppointments(updated);
    localStorage.setItem("hospital_appointments", JSON.stringify(updated));
    
    toast.success("Appointment Scheduled Successfully");
    
    // Reset form
    setSelectedPatient("");
    setSelectedDoctor("");
    setSelectedDate("");
    setSelectedTime("");
    setReason("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar Layout */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 z-20 overflow-y-auto">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 sticky top-0 bg-white">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center mr-3 shadow-sm">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-lg text-slate-900">Secure<span className="text-primary">EHR</span></span>
        </div>
        
        <div className="p-4 pb-20">
          <div className="flex items-center gap-3 p-3 mb-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">Hospital Admin</p>
              <p className="text-xs text-slate-500">Case Management</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("management")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                activeTab === "management" 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Activity className={`w-5 h-5 ${activeTab === "management" ? "text-white" : "text-slate-400"}`} />
              Case Management
            </button>
            <button
              onClick={() => setActiveTab("directory")}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                activeTab === "directory" 
                  ? "bg-primary text-white shadow-md shadow-primary/20" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Users className={`w-5 h-5 ${activeTab === "directory" ? "text-white" : "text-slate-400"}`} />
              Directory
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto relative bg-slate-50/50">
        <div className="max-w-6xl mx-auto p-6 lg:p-10 pb-24">
          <AnimatePresence mode="wait">
            
            {activeTab === "management" && (
              <motion.div key="management" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="mb-8">
                  <h2 className="text-3xl font-extrabold text-slate-900">Case Management</h2>
                  <p className="text-slate-500 mt-1 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Hospital acts solely as an administrative bridge. Zero access to health records.
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left Column: Form */}
                  <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl shadow-soft border border-slate-200 p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-lg text-slate-900">Assign Patient</h3>
                          <p className="text-xs text-slate-500">Book an appointment slot</p>
                        </div>
                      </div>

                      <form onSubmit={handleCreateAppointment} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Select Patient</label>
                          <select 
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-primary transition-all font-medium text-slate-900"
                            value={selectedPatient}
                            onChange={(e) => setSelectedPatient(e.target.value)}
                            required
                          >
                            <option value="">-- Choose Patient --</option>
                            {patients.map(p => (
                              <option key={p.id} value={p.id}>{p.full_name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Assign to Doctor</label>
                          <select 
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-primary transition-all font-medium text-slate-900"
                            value={selectedDoctor}
                            onChange={(e) => setSelectedDoctor(e.target.value)}
                            required
                          >
                            <option value="">-- Choose Doctor --</option>
                            {doctors.map(d => (
                              <option key={d.id} value={d.id}>Dr. {d.full_name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Date</label>
                            <input 
                              type="date" 
                              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-primary transition-all font-medium text-slate-900"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Time Slot</label>
                            <select 
                              className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-primary transition-all font-medium text-slate-900"
                              value={selectedTime}
                              onChange={(e) => setSelectedTime(e.target.value)}
                              required
                            >
                              <option value="">Slot</option>
                              <option value="09:00 AM">09:00 AM</option>
                              <option value="10:00 AM">10:00 AM</option>
                              <option value="11:30 AM">11:30 AM</option>
                              <option value="02:00 PM">02:00 PM</option>
                              <option value="04:00 PM">04:00 PM</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Reason (Admin Note)</label>
                          <textarea 
                            className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:border-primary transition-all font-medium text-slate-900 resize-none"
                            rows={2}
                            placeholder="E.g. General checkup, Cardiology consult"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                          />
                        </div>

                        <Button type="submit" className="w-full py-4 mt-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-sm">
                          Schedule Appointment
                        </Button>
                      </form>
                    </div>
                  </div>

                  {/* Right Column: Appointments List */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl shadow-soft border border-slate-200 p-8 h-full">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-xl font-extrabold text-slate-900">Active Assignments</h2>
                          <p className="text-sm text-slate-500">Upcoming appointments and admitted patients.</p>
                        </div>
                        <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-100 text-sm font-bold text-slate-700">
                          Total: {appointments.length}
                        </div>
                      </div>

                      {appointments.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500 font-medium">No active appointments scheduled.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {appointments.map((apt) => (
                            <div key={apt.id} className="p-5 rounded-2xl border border-slate-100 bg-white hover:shadow-soft transition-all group flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                              
                              <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0 text-slate-400">
                                  <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-slate-900 text-lg">{apt.patientName}</h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm font-semibold text-primary">Dr. {apt.doctorName}</span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{apt.reason || "Consultation"}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 text-right min-w-[140px]">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{new Date(apt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</p>
                                <p className="font-bold text-slate-800">{apt.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "directory" && (
              <motion.div key="directory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="mb-8">
                  <h2 className="text-3xl font-extrabold text-slate-900">Hospital Directory</h2>
                  <p className="text-slate-500 mt-1">Registered users in the system.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Doctors */}
                  <div className="bg-white rounded-3xl shadow-soft border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Activity className="w-5 h-5" />
                      </div>
                      <h3 className="font-extrabold text-lg text-slate-900">Medical Staff</h3>
                    </div>
                    <div className="p-6 divide-y divide-slate-100">
                      {doctors.length === 0 ? (
                        <p className="text-slate-500 text-sm">No doctors found.</p>
                      ) : doctors.map(doc => (
                        <div key={doc.id} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                            {doc.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">Dr. {doc.full_name}</p>
                            <p className="text-xs text-slate-500">{doc.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Patients */}
                  <div className="bg-white rounded-3xl shadow-soft border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Heart className="w-5 h-5" />
                      </div>
                      <h3 className="font-extrabold text-lg text-slate-900">Registered Patients</h3>
                    </div>
                    <div className="p-6 divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                      {patients.length === 0 ? (
                        <p className="text-slate-500 text-sm">No patients found.</p>
                      ) : patients.map(pat => (
                        <div key={pat.id} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                            {pat.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{pat.full_name}</p>
                            <p className="text-xs text-slate-500">{pat.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
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
