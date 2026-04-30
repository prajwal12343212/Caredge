"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Clock, Activity, FileText, Lock, Users, ArrowRight } from "lucide-react";

export default function Home() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-background selection:bg-primary/20 selection:text-primary">
      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-primary/10 mix-blend-multiply filter blur-[100px] opacity-70 animate-pulse-slow"></div>
      <div className="absolute top-[40%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent/10 mix-blend-multiply filter blur-[100px] opacity-70 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-[100%] bg-primary/5 filter blur-[80px]"></div>

      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/70 backdrop-blur-md border-b border-white/20 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">Secure<span className="text-primary">EHR</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">How it Works</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login?role=doctor" className="hidden md:block text-sm font-semibold text-slate-600 hover:text-primary transition-colors">
              Doctor Login
            </Link>
            <Link href="/login?role=patient" className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
              Patient Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
        <motion.div 
          className="flex-1 text-center lg:text-left z-10"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-xs font-bold text-primary uppercase tracking-wide">Next-Gen Health Data</span>
          </motion.div>
          
          <motion.h1 variants={fadeIn} className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-6">
            Your Health Records, <br className="hidden lg:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-brand">Fully Under Your Control.</span>
          </motion.h1>
          
          <motion.p variants={fadeIn} className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Securely manage your medical history and grant doctors <strong className="text-slate-800 font-semibold">time-limited, revocable access</strong> via unique tokens. Total privacy with zero friction.
          </motion.p>
          
          <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <Link 
              href="/register?role=patient" 
              className="px-8 py-4 bg-gradient-brand text-white font-semibold rounded-2xl shadow-glow hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-1"
            >
              Get Started for Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a 
              href="#how-it-works" 
              className="px-8 py-4 bg-white text-slate-700 font-semibold rounded-2xl shadow-soft border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300 flex items-center justify-center gap-2"
            >
              See How It Works
            </a>
          </motion.div>
        </motion.div>

        {/* Hero Graphic / Abstract Illustration */}
        <motion.div 
          className="flex-1 w-full max-w-lg lg:max-w-none relative z-10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="relative w-full aspect-square md:aspect-[4/3] lg:aspect-square">
            {/* Main Glass Card */}
            <div className="absolute inset-0 bg-white/40 backdrop-blur-xl rounded-[2.5rem] border border-white/60 shadow-glass animate-float p-8 flex flex-col justify-between overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-brand opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Access Token</h3>
                </div>
                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="p-4 bg-white/60 rounded-2xl border border-white/80 shadow-sm">
                  <div className="flex justify-between text-sm font-medium text-slate-500 mb-2">
                    <span>Time Remaining</span>
                    <span className="text-primary">00:45:12</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-gradient-brand rounded-full"></div>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1 h-12 bg-white/60 rounded-2xl border border-white/80 flex items-center px-4 gap-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div className="h-2 w-16 bg-slate-200 rounded-full"></div>
                  </div>
                  <div className="w-12 h-12 bg-accent/10 rounded-2xl border border-accent/20 flex items-center justify-center text-accent">
                    <Lock className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -right-8 top-1/4 bg-white p-4 rounded-2xl shadow-soft border border-slate-100 animate-float" style={{ animationDelay: '1s' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Doctor" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Dr. Sarah Jenkins</p>
                  <p className="text-xs text-slate-500">Access Granted</p>
                </div>
              </div>
            </div>

            <div className="absolute -left-6 bottom-1/4 bg-slate-900 p-4 rounded-2xl shadow-xl animate-float" style={{ animationDelay: '2s' }}>
               <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <p className="text-sm font-semibold text-white">End-to-End Encrypted</p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Everything you need to manage health data securely.</h2>
            <p className="mt-4 text-lg text-slate-500">Designed for modern patients and forward-thinking medical professionals.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, title: "Token-Based Security", desc: "Generate unique, cryptographic tokens for every doctor visit. No permanent access, ever." },
              { icon: Clock, title: "Time-Limited Sessions", desc: "You decide how long a doctor can view your records. Access auto-revokes when time is up." },
              { icon: Activity, title: "Live Treatment Tracking", desc: "Doctors can append diagnosis and prescriptions directly to your timeline during an active session." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-50 rounded-3xl p-8 hover:bg-white hover:shadow-soft transition-all duration-300 border border-transparent hover:border-slate-100 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-slate-50 relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">How it works</h2>
            <p className="mt-4 text-lg text-slate-500">A seamless experience for both patients and doctors.</p>
          </div>

          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 -translate-y-1/2 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
              {[
                { step: "01", title: "Upload Records", desc: "Securely store your PDFs and images." },
                { step: "02", title: "Generate Token", desc: "Set a time limit and get a secure QR/string." },
                { step: "03", title: "Doctor Access", desc: "Doctor inputs token to view files & add notes." },
                { step: "04", title: "Auto-Revoke", desc: "Access expires automatically. You stay in control." }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center relative"
                >
                  <div className="w-12 h-12 bg-gradient-brand text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-6 shadow-md transform -translate-y-12 border-4 border-slate-50">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2 -mt-4">{item.title}</h3>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-8 relative z-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <span className="font-extrabold text-xl text-slate-900">Secure<span className="text-primary">EHR</span></span>
              </div>
              <p className="text-slate-500 max-w-sm">
                Empowering patients with cryptographically secure, time-bound control over their personal health information.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Platform</h4>
              <ul className="space-y-3">
                <li><Link href="/login?role=patient" className="text-slate-500 hover:text-primary transition-colors">Patient Portal</Link></li>
                <li><Link href="/login?role=doctor" className="text-slate-500 hover:text-primary transition-colors">Doctor Portal</Link></li>
                <li><a href="#" className="text-slate-500 hover:text-primary transition-colors">Security Details</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-slate-500 hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-slate-500 hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-slate-500 hover:text-primary transition-colors">HIPAA Compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">© 2026 SecureEHR. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-colors">
                <Users className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
