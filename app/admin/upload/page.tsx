"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

interface ParsedRow {
  display_name: string;
  team_name: string;
  position: string;
  match_date: string;
  raw_score: number | null;
  ranking: number | null;
  reward: number | null;
}

export default function UploadPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/admin/login");
        return;
      }
      setUser(user);
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());

    // Find column indices
    const displayNameIdx = headers.findIndex((h) =>
      h.toLowerCase().includes("display") || h.toLowerCase().includes("name")
    );
    const teamIdx = headers.findIndex((h) => h.toLowerCase().includes("team"));
    const positionIdx = headers.findIndex((h) => h.toLowerCase().includes("position"));

    // Find date columns (format: M/D/YYYY)
    const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    const dateColumns = headers
      .map((h, i) => ({ header: h, index: i }))
      .filter((col) => datePattern.test(col.header));

    const rows: ParsedRow[] = [];
    let currentPlayer: { name: string; team: string; position: string } | null = null;
    let currentMetric: string | null = null;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());

      // Check if this is a player row (has name in first column)
      if (values[displayNameIdx] && values[displayNameIdx] !== "") {
        currentPlayer = {
          name: values[displayNameIdx],
          team: values[teamIdx] || "",
          position: values[positionIdx] || "",
        };
      }

      // Check for metric type (Raw Score, Ranking, Reward)
      const metricCol = values.find((v) =>
        ["raw score", "ranking", "reward"].includes(v.toLowerCase())
      );
      if (metricCol) {
        currentMetric = metricCol.toLowerCase();
      }

      // Parse values for each date column
      if (currentPlayer && currentMetric) {
        dateColumns.forEach((dateCol) => {
          const value = values[dateCol.index];
          if (value && value !== "") {
            const numValue = parseFloat(value.replace(/,/g, ""));
            if (!isNaN(numValue)) {
              // Find or create row for this player/date
              let row = rows.find(
                (r) =>
                  r.display_name === currentPlayer!.name &&
                  r.match_date === dateCol.header
              );

              if (!row) {
                row = {
                  display_name: currentPlayer!.name,
                  team_name: currentPlayer!.team,
                  position: currentPlayer!.position,
                  match_date: dateCol.header,
                  raw_score: null,
                  ranking: null,
                  reward: null,
                };
                rows.push(row);
              }

              if (currentMetric === "raw score") row.raw_score = numValue;
              if (currentMetric === "ranking") row.ranking = numValue;
              if (currentMetric === "reward") row.reward = numValue;
            }
          }
        });
      }
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError("");
    setSuccess("");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        setPreview(parsed.slice(0, 20)); // Show first 20 rows
      } catch (err) {
        setError("Failed to parse CSV file");
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);

        // Get unique players
        const uniquePlayers = [...new Set(parsed.map((r) => r.display_name))];

        // Ensure players exist in database
        for (const playerName of uniquePlayers) {
          const playerData = parsed.find((r) => r.display_name === playerName);

          const { data: existingPlayer } = await supabase
            .from("players")
            .select("id")
            .eq("display_name", playerName)
            .single();

          if (!existingPlayer) {
            await supabase.from("players").insert({
              display_name: playerName,
              team_name: playerData?.team_name || null,
              position: playerData?.position || null,
            });
          }
        }

        // Get all player IDs
        const { data: players } = await supabase
          .from("players")
          .select("id, display_name");

        const playerMap = new Map(players?.map((p) => [p.display_name, p.id]));

        // Insert performance data
        const performanceRecords = parsed
          .filter((r) => r.raw_score !== null || r.ranking !== null || r.reward !== null)
          .map((r) => {
            // Convert date format M/D/YYYY to YYYY-MM-DD
            const [month, day, year] = r.match_date.split("/");
            const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

            return {
              player_id: playerMap.get(r.display_name),
              match_date: isoDate,
              raw_score: r.raw_score,
              ranking: r.ranking,
              reward: r.reward,
            };
          })
          .filter((r) => r.player_id);

        // Upsert performance records
        const { error: insertError } = await supabase
          .from("performance")
          .upsert(performanceRecords, {
            onConflict: "player_id,match_date",
          });

        if (insertError) {
          throw insertError;
        }

        setSuccess(
          `Successfully imported ${performanceRecords.length} performance records for ${uniquePlayers.length} players`
        );
        setFile(null);
        setPreview([]);
      };
      reader.readAsText(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
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
      <div>
        <h1 className="text-3xl font-bold text-white">Upload Data</h1>
        <p className="text-gray-400 mt-2">
          Import performance data from CSV files
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV Upload</CardTitle>
          <CardDescription>
            Upload a CSV file with player performance data. The file should have
            columns for player name, team, position, and dates with scores,
            rankings, and rewards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700
              file:cursor-pointer cursor-pointer"
          />

          {error && <p className="text-red-500">{error}</p>}
          {success && <p className="text-green-500">{success}</p>}

          {preview.length > 0 && (
            <div>
              <h4 className="font-medium text-white mb-2">
                Preview (first 20 rows)
              </h4>
              <div className="overflow-x-auto max-h-64 border border-gray-700 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Player</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-right">Score</th>
                      <th className="px-3 py-2 text-right">Rank</th>
                      <th className="px-3 py-2 text-right">Reward</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {preview.map((row, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{row.display_name}</td>
                        <td className="px-3 py-2">{row.match_date}</td>
                        <td className="px-3 py-2 text-right">{row.raw_score ?? "-"}</td>
                        <td className="px-3 py-2 text-right">{row.ranking ?? "-"}</td>
                        <td className="px-3 py-2 text-right">
                          {row.reward ? `$${row.reward.toLocaleString()}` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "Uploading..." : "Upload Data"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/admin")}
            >
              Back to Admin
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expected CSV Format</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-sm text-gray-400 bg-gray-800 p-4 rounded-lg overflow-x-auto">
{`Display Name,Team Name,Position,,4/4/2025,4/8/2025,4/11/2025
Lamine Yamal,Barcelona,Forward,Raw Score,131,185,70
,,,Ranking,4,5,22
,,,Reward,7788,1000,0`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
