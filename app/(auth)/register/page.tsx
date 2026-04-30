"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";

export default function Register() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "doctor" ? "doctor" : "patient";
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(defaultRole);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { id: data.user.id, full_name: name, email, role }
          ]);

        if (profileError) throw profileError;
        
        router.push(`/${role}/dashboard`);
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
