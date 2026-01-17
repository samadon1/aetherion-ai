// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<SPDX-License-Identifier: MPL-2.0>
// Gap Finder Tab - Analyzes data gaps using Gemini

import SearchIcon from "@mui/icons-material/Search";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import {
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Box,
  TextField,
} from "@mui/material";
import { useState, useCallback } from "react";
import Stack from "@lichtblick/suite-base/components/Stack";
import { GapCard } from "./types";

type GapFinderTabProps = {
  gaps: GapCard[];
  onGapsUpdate: (gaps: GapCard[]) => void;
  onSimulateGap: (gap: GapCard) => void;
  geminiApiKey: string;
  topicInfo: { topics: string[]; messageCount: number; duration: number };
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export function GapFinderTab({
  gaps,
  onGapsUpdate,
  onSimulateGap,
  geminiApiKey,
  topicInfo
}: GapFinderTabProps): React.JSX.Element {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userScenario, setUserScenario] = useState("");
  const [error, setError] = useState<string | null>(null);

  const analyzeGaps = useCallback(async () => {
    if (!geminiApiKey) {
      setError("Gemini API key not configured. Add it in panel settings.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    const prompt = `You are an autonomous vehicle data analyst. Identify missing driving scenarios in this dataset.

Dataset: ${topicInfo.topics.length} topics, ${topicInfo.duration.toFixed(0)}s duration
${userScenario ? `Focus on: ${userScenario}` : ""}

Find 3-5 gaps. For each, provide a SIMPLE video generation prompt (1 sentence, describing a driving scene).

IMPORTANT: The "dataToGenerate" field must be a simple, clear description like:
- "Car driving on a rainy highway at night"
- "Vehicle stopping at a red light in heavy traffic"
- "Car merging onto freeway in sunny weather"

Respond in JSON:
{
  "gaps": [
    {
      "title": "Short title",
      "description": "What's missing",
      "severity": "low|medium|high",
      "category": "weather|traffic|edge_case|scenario",
      "suggestedAction": "How to fix",
      "dataToGenerate": "Simple 1-sentence driving scene description"
    }
  ]
}`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const newGaps: GapCard[] = parsed.gaps.map((g: Record<string, unknown>, i: number) => ({
          id: `gap-${Date.now()}-${i}`,
          ...g,
        }));
        onGapsUpdate(newGaps);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze gaps");
    } finally {
      setIsAnalyzing(false);
    }
  }, [geminiApiKey, topicInfo, userScenario, onGapsUpdate]);

  const getSeverityColor = (severity: string): "error" | "warning" | "success" => {
    switch (severity) {
      case "high": return "error";
      case "medium": return "warning";
      default: return "success";
    }
  };

  return (
    <Stack fullHeight style={{ padding: 16, overflow: "auto" }}>
      {/* Analysis Controls */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <AutoAwesomeIcon />
          AI Gap Analysis
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Describe specific scenarios you need (e.g., 'rainy night driving', 'heavy traffic intersections')..."
          value={userScenario}
          onChange={(e) => setUserScenario(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          startIcon={isAnalyzing ? <CircularProgress size={20} /> : <SearchIcon />}
          onClick={() => void analyzeGaps()}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? "Analyzing..." : "Analyze Data Gaps"}
        </Button>

        {error && (
          <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>
        )}
      </Box>

      {/* Gap Cards */}
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Found Gaps ({gaps.length})
        </Typography>

        {gaps.length === 0 ? (
          <Typography color="text.secondary">
            No gaps analyzed yet. Click &quot;Analyze Data Gaps&quot; to start.
          </Typography>
        ) : (
          <Stack gap={2}>
            {gaps.map((gap) => (
              <Card key={gap.id} sx={{ bgcolor: "background.paper" }}>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{gap.title}</Typography>
                    <Chip
                      label={gap.severity}
                      color={getSeverityColor(gap.severity)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {gap.description}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>Category:</strong> {gap.category}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>Suggestion:</strong> {gap.suggestedAction}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PlayArrowIcon />}
                    onClick={() => onSimulateGap(gap)}
                  >
                    Simulate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
