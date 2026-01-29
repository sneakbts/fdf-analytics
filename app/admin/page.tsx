"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    playerCount: 0,
    priceCount: 0,
    performanceCount: 0,
    lastPriceUpdate: null as string | null,
  });
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/admin/login");
        return;
      }
      setUser(user);
      setLoading(false);

      // Load stats
      const [
        { count: playerCount },
        { count: priceCount },
        { count: performanceCount },
        { data: lastPrice },
      ] = await Promise.all([
        supabase.from("players").select("*", { count: "exact", head: true }),
        supabase.from("prices").select("*", { count: "exact", head: true }),
        supabase.from("performance").select("*", { count: "exact", head: true }),
        supabase
          .from("prices")
          .select("fetched_at")
          .order("fetched_at", { ascending: false })
          .limit(1)
          .single(),
      ]);

      setStats({
        playerCount: playerCount || 0,
        priceCount: priceCount || 0,
        performanceCount: performanceCount || 0,
        lastPriceUpdate: lastPrice?.fetched_at || null,
      });
    }

    checkAuth();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  const triggerPriceFetch = async () => {
    try {
      const response = await fetch("/api/cron/fetch-prices", {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}`,
        },
      });
      const data = await response.json();
      alert(data.message || "Price fetch triggered");
      window.location.reload();
    } catch (error) {
      alert("Failed to trigger price fetch");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-2">Logged in as {user?.email}</p>
        </div>
        <Button variant="secondary" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Players</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{stats.playerCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price Records</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {stats.priceCount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Records</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {stats.performanceCount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last Price Update</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-white">
              {stats.lastPriceUpdate
                ? new Date(stats.lastPriceUpdate).toLocaleString()
                : "Never"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Link href="/admin/upload">
              <Button>Upload CSV Data</Button>
            </Link>
            <Button variant="secondary" onClick={triggerPriceFetch}>
              Trigger Price Fetch
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Info */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-white">Cron Schedule</h4>
            <p className="text-gray-400">
              Prices are fetched every 15 minutes via Vercel Cron
            </p>
          </div>
          <div>
            <h4 className="font-medium text-white">Data Sources</h4>
            <p className="text-gray-400">
              Price data: Tenero API (api.tenero.io)
              <br />
              Performance data: Manual CSV upload
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
