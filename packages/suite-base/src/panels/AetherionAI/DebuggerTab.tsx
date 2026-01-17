// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<SPDX-License-Identifier: MPL-2.0>
// Debugger Tab - Analyzes why events happened using Gemini

import BugReportIcon from "@mui/icons-material/BugReport";
import SendIcon from "@mui/icons-material/Send";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import {
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Box,
  TextField,
  Chip,
  Slider,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useState, useCallback } from "react";
import Stack from "@lichtblick/suite-base/components/Stack";
import TextContent from "@lichtblick/suite-base/components/TextContent";
import { DebugQuery } from "./types";

type DebuggerTabProps = {
  debugHistory: DebugQuery[];
  onHistoryUpdate: (history: DebugQuery[]) => void;
  geminiApiKey: string;
  topicInfo: {
    topics: string[];
    messageCount: number;
    duration: number;
    currentTime: number;
    frameData: string;
    subscribedCount: number;
    onSeekTo: (seconds: number) => void;
  };
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

export function DebuggerTab({
  debugHistory,
  onHistoryUpdate,
  geminiApiKey,
  topicInfo,
}: DebuggerTabProps): React.JSX.Element {
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seekTime, setSeekTime] = useState<number>(topicInfo.currentTime);

  const askQuestion = useCallback(async () => {
    if (!geminiApiKey) {
      setError("Gemini API key not configured. Add it in panel settings.");
      return;
    }

    if (!question.trim()) return;

    setIsAsking(true);
    setError(null);

    const queryId = `debug-${Date.now()}`;
    const newQuery: DebugQuery = {
      id: queryId,
      question,
      timestamp: Date.now(),
      status: "pending",
    };

    onHistoryUpdate([newQuery, ...debugHistory]);

    const topicList = topicInfo.topics.length > 0 ? topicInfo.topics.join(", ") : "No topics loaded";
    const topicCount = topicInfo.topics.length;
    const hasLiveData = topicInfo.frameData.length > 0;

    const prompt = `You are an autonomous vehicle systems debugger and analyst. Help the user understand what happened in their driving data.

## Dataset Context
- Number of available topics: ${topicCount}
- Topics: ${topicList}
- Recording duration: ${topicInfo.duration.toFixed(2)} seconds
- Current playback position: ${topicInfo.currentTime.toFixed(3)} seconds
- Subscribed topics receiving data: ${topicInfo.subscribedCount}

${hasLiveData ? `## LIVE SENSOR DATA AT CURRENT TIMESTAMP (${topicInfo.currentTime.toFixed(3)}s)
The following is actual sensor data from the vehicle at the current playback position:

${topicInfo.frameData}

---` : "## No live data available - seek to a timestamp to get sensor readings"}

## User's Question
${question}

## Your Analysis
Based on the ${hasLiveData ? "ACTUAL SENSOR DATA above" : "available topics"}, provide a detailed technical analysis:

1. **What the data shows**: ${hasLiveData ? "Analyze the specific sensor values provided above" : "Describe what data would be available"}
2. **Interpretation**: What does this indicate about vehicle behavior at this moment?
3. **Anomaly detection**: Are there any unusual values or patterns in the data?
4. **Root cause analysis**: What could explain the observed behavior?
5. **Recommendations**: What additional data or investigation would help?

Be specific and reference the actual data values when available. Provide actionable insights.`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated";

      onHistoryUpdate([
        { ...newQuery, answer, status: "completed" },
        ...debugHistory,
      ]);
    } catch (err) {
      onHistoryUpdate([
        { ...newQuery, answer: err instanceof Error ? err.message : "Failed to get answer", status: "failed" },
        ...debugHistory,
      ]);
      setError(err instanceof Error ? err.message : "Failed to analyze");
    } finally {
      setIsAsking(false);
      setQuestion("");
    }
  }, [geminiApiKey, question, topicInfo, debugHistory, onHistoryUpdate]);

  const clearHistory = useCallback(() => {
    onHistoryUpdate([]);
  }, [onHistoryUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void askQuestion();
    }
  }, [askQuestion]);

  const handleSeek = useCallback(() => {
    topicInfo.onSeekTo(seekTime);
  }, [topicInfo, seekTime]);

  const handleSliderChange = useCallback((_: Event, value: number | number[]) => {
    setSeekTime(value as number);
  }, []);

  const hasLiveData = topicInfo.frameData.length > 0;

  return (
    <Stack fullHeight style={{ padding: 16, overflow: "auto" }}>
      {/* Query Input */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
          <BugReportIcon />
          AI Debugger
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Ask questions about your data - why things happened, anomaly analysis, root cause investigation.
        </Typography>

        {/* Status chips */}
        <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            label={`${topicInfo.topics.length} topics`}
            size="small"
            color={topicInfo.topics.length > 0 ? "success" : "default"}
          />
          <Chip
            label={`${topicInfo.duration.toFixed(1)}s duration`}
            size="small"
            color={topicInfo.duration > 0 ? "success" : "default"}
          />
          <Chip
            label={`@ ${topicInfo.currentTime.toFixed(2)}s`}
            size="small"
            color="primary"
          />
          <Chip
            label={hasLiveData ? `${topicInfo.subscribedCount} subscribed` : "No live data"}
            size="small"
            color={hasLiveData ? "success" : "warning"}
          />
        </Box>

        {/* Seek control */}
        {topicInfo.duration > 0 && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: "rgba(100,100,255,0.1)", borderRadius: 1, border: "1px solid rgba(100,100,255,0.3)" }}>
            <Typography variant="caption" color="primary" sx={{ fontWeight: "bold", display: "block", mb: 1 }}>
              Seek to timestamp:
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Slider
                value={seekTime}
                onChange={handleSliderChange}
                min={0}
                max={topicInfo.duration}
                step={0.1}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) => `${v.toFixed(1)}s`}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                type="number"
                value={seekTime.toFixed(1)}
                onChange={(e) => setSeekTime(parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, max: topicInfo.duration, step: 0.1 }}
                sx={{ width: 80 }}
              />
              <Tooltip title="Seek to timestamp">
                <IconButton color="primary" onClick={handleSeek} size="small">
                  <PlayArrowIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}

        {/* Live data preview */}
        {hasLiveData && (
          <Box
            sx={{
              mb: 2,
              p: 1,
              bgcolor: "rgba(0,255,0,0.1)",
              borderRadius: 1,
              border: "1px solid rgba(0,255,0,0.3)",
              maxHeight: 150,
              overflow: "auto",
            }}
          >
            <Typography variant="caption" color="success.main" sx={{ fontWeight: "bold" }}>
              Live sensor data at {topicInfo.currentTime.toFixed(2)}s:
            </Typography>
            <Typography
              variant="caption"
              component="pre"
              sx={{
                fontFamily: "monospace",
                fontSize: "10px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
                m: 0,
                mt: 0.5,
              }}
            >
              {topicInfo.frameData.substring(0, 800)}{topicInfo.frameData.length > 800 ? "..." : ""}
            </Typography>
          </Box>
        )}

        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder="Ask a question (e.g., 'Why did the vehicle brake?', 'Analyze the sensor data', 'Is the IMU data normal?')..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            startIcon={isAsking ? <CircularProgress size={20} /> : <SendIcon />}
            onClick={() => void askQuestion()}
            disabled={isAsking || !question.trim()}
          >
            {isAsking ? "Analyzing..." : "Ask"}
          </Button>
          {debugHistory.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={clearHistory}
            >
              Clear History
            </Button>
          )}
        </Box>

        {error && (
          <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>
        )}
      </Box>

      {/* Conversation History */}
      <Box>
        {debugHistory.length === 0 ? (
          <Typography color="text.secondary">
            No questions asked yet. Use the slider to seek to a timestamp, then ask a question.
          </Typography>
        ) : (
          <Stack gap={2}>
            {debugHistory.map((query) => (
              <Card key={query.id} sx={{ bgcolor: "background.paper" }}>
                <CardContent>
                  <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                    Q: {query.question}
                  </Typography>
                  {query.status === "pending" && <CircularProgress size={20} />}
                  {query.answer && (
                    <Box sx={{ mt: 1 }}>
                      {query.status === "failed" ? (
                        <Typography variant="body2" color="error.main">
                          {query.answer}
                        </Typography>
                      ) : (
                        <TextContent>{query.answer}</TextContent>
                      )}
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                        {new Date(query.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
