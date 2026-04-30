"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "doctor" ? "doctor" : "patient";
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role
          }
        }
      });

      if (authError) throw authError;

      if (data.user) {
        // If email confirmation is ON, Supabase returns user but no session
        if (!data.session) {
          setSuccess("Registration successful! Please check your email to confirm your account before logging in.");
        } else {
          // Fallback: Manually insert the profile if the database trigger fails or is missing.
          // The RLS policy allows users to insert their own profile.
          const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user.id,
            role: role,
            full_name: name,
            email: email
          });
          
          if (profileError && profileError.code !== '23505') { // Ignore unique violation if trigger succeeded
            console.error("Profile insertion fallback error:", profileError);
          }

          router.push(`/${role}/dashboard`);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Create Account</h1>
          <p className="text-slate-500 text-sm">Join as a {role}</p>
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

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Check your email</h3>
            <p className="text-slate-500 mb-6">{success}</p>
            <Link href={`/login?role=${role}`}>
              <Button className="w-full">Go to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <Input 
              label="Full Name" 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
              placeholder={role === "doctor" ? "Dr. John Doe" : "John Doe"}
            />
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
              placeholder="Create a password"
              minLength={6}
            />
            
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{error}</div>}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Register
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href={`/login?role=${role}`} className="text-primary hover:underline font-medium">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
