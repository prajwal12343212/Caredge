"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "doctor" ? "doctor" : "patient";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has the correct role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role !== role) {
        throw new Error(`Invalid credentials for ${role} portal`);
      }

      // Log login event
      try {
        await fetch('/api/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id,
            userRole: role,
            action: role === 'doctor' ? 'DOCTOR_LOGIN' : 'PATIENT_LOGIN',
            description: `Successfully logged in to ${role} portal.`
          })
        });
      } catch (err) {
        console.error('Failed to log login event:', err);
      }

      router.push(`/${role}/dashboard`);
    } catch (err: any) {
      setError(err.message || "Failed to login");
      
      // Try to find the user by email to log the failed attempt for AI Threat Detection
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('email', email)
          .single();
          
        if (profileData) {
          await fetch('/api/audit/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: profileData.id,
              userRole: profileData.role,
              action: 'FAILED_LOGIN',
              description: `Failed login attempt using invalid credentials.`
            })
          });
        }
      } catch (logErr) {
        // Ignore log errors
      }
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h1>
          <p className="text-slate-500 text-sm">Sign in to your {role} portal</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            onClick={() => setRole("patient")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${role === "patient" ? "bg-white shadow-sm text-primary" : "text-slate-600 hover:text-slate-900"}`}
          >
            Patient
          </button>
          <button
            onClick={() => setRole("doctor")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${role === "doctor" ? "bg-white shadow-sm text-primary" : "text-slate-600 hover:text-slate-900"}`}
          >
            Doctor
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input 
            label="Email Address" 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
            placeholder="Enter your email"
          />
          <Input 
            label="Password" 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
            placeholder="Enter your password"
          />
          
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}

          <Button type="submit" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{" "}
          <Link href={`/register?role=${role}`} className="text-primary hover:underline font-medium">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
