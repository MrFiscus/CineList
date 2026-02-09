"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const signOut = async () => {
      await supabase.auth.signOut();
      router.replace("/login");
    };
    signOut();
  }, [router]);

  return (
    <div className="app">
      <header className="hero">
        <div>
          <div className="kicker-signout">Hoping to See you Again...</div>
          <h1>Signing out...</h1>
        </div>
      </header>
    </div>
  );
}
