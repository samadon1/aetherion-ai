// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<SPDX-License-Identifier: MPL-2.0>
// Sim Tab - Generates synthetic data using Cosmos Predict (Video2World)

import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import {
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  LinearProgress,
  Box,
  TextField,
  IconButton,
  Alert,
} from "@mui/material";
import { useState, useCallback, useEffect, useRef } from "react";
import Stack from "@lichtblick/suite-base/components/Stack";
import { SimulationJob, GapCard } from "./types";

type SimTabProps = {
  simJobs: SimulationJob[];
  onJobsUpdate: (jobs: SimulationJob[]) => void;
  currentGap: GapCard | null;
  cosmosEndpoint: string;
  capturedFrame: string | null;
  capturedFrameTopic: string | null;
};

// Convert HF space URL to actual API endpoint
function getApiEndpoint(endpoint: string): string {
  // If it's a huggingface.co/spaces URL, convert to hf.space format
  if (endpoint.includes("huggingface.co/spaces/")) {
    const match = endpoint.match(/huggingface\.co\/spaces\/([^/]+)\/([^/]+)/);
    if (match) {
      return `https://${match[1]}-${match[2]}.hf.space`;
    }
  }
  // If it already ends with hf.space, use as is
  if (endpoint.includes(".hf.space")) {
    return endpoint.replace(/\/$/, ""); // Remove trailing slash
  }
  return endpoint;
}

export function SimTab({
  simJobs,
  onJobsUpdate,
  currentGap,
  cosmosEndpoint,
  capturedFrame,
  capturedFrameTopic,
}: SimTabProps): React.JSX.Element {
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set prompt from gap when switched to this tab
  useEffect(() => {
    if (currentGap?.dataToGenerate) {
      setCustomPrompt(currentGap.dataToGenerate);
    }
  }, [currentGap]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const useCapturedFrame = useCallback(() => {
    if (capturedFrame) {
      setSelectedImage(capturedFrame);
      // Create a dummy file object since we have base64 data
      setImageFile(new File([], "captured_frame.jpg", { type: "image/jpeg" }));
    }
  }, [capturedFrame]);

  const generateVideo = useCallback(async (prompt: string, gapId?: string) => {
    if (!selectedImage || !imageFile) {
      return;
    }

    setIsGenerating(true);

    const jobId = `sim-${Date.now()}`;
    const newJob: SimulationJob = {
      id: jobId,
      gapId: gapId || "",
      prompt,
      status: "running",
    };

    onJobsUpdate([newJob, ...simJobs]);

    try {
      const apiBase = getApiEndpoint(cosmosEndpoint);

      // Convert image to base64
      const base64Image = selectedImage.split(",")[1]; // Remove data:image/...;base64, prefix

      console.log("Cosmos API request:", {
        endpoint: `${apiBase}/predict`,
        prompt,
        imageLength: base64Image?.length || 0,
        imagePreview: base64Image?.substring(0, 50) + "...",
      });

      // Call the Cosmos Predict API
      // Using 57 frames (~3.5s video) and 25 steps for good quality with reasonable speed
      const response = await fetch(`${apiBase}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          image: base64Image,
          num_frames: 57,
          num_inference_steps: 25,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Cosmos API error:", response.status, errorText);
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Handle different response formats
      let videoUrl = data.video_url || data.videoUrl || data.url || data.output;

      // If it's a base64 video, create a blob URL
      if (data.video_base64 || data.video) {
        const videoData = data.video_base64 || data.video;
        const binary = atob(videoData);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "video/mp4" });
        videoUrl = URL.createObjectURL(blob);
      }

      if (videoUrl) {
        onJobsUpdate([
          { ...newJob, status: "completed", videoUrl },
          ...simJobs,
        ]);
      } else {
        throw new Error("No video URL in response");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Generation failed";
      onJobsUpdate([
        { ...newJob, status: "failed", error: `Failed to fetch: ${getApiEndpoint(cosmosEndpoint)}/predict - ${errorMsg}` },
        ...simJobs,
      ]);
    } finally {
      setIsGenerating(false);
    }
  }, [cosmosEndpoint, simJobs, onJobsUpdate, selectedImage, imageFile]);

  const removeJob = useCallback((jobId: string) => {
    onJobsUpdate(simJobs.filter(j => j.id !== jobId));
  }, [simJobs, onJobsUpdate]);

  return (
    <Stack fullHeight style={{ padding: 16, overflow: "auto" }}>
      {/* Generation Controls */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <VideoLibraryIcon />
          Data Simulation
        </Typography>

        {currentGap && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Filling gap:</strong> {currentGap.title}
          </Alert>
        )}


        {/* Image Selection */}
        <Box sx={{ mb: 2 }}>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            style={{ display: "none" }}
          />

          <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
            {capturedFrame && (
              <Button
                variant={selectedImage === capturedFrame ? "contained" : "outlined"}
                startIcon={<CameraAltIcon />}
                onClick={useCapturedFrame}
                color="success"
              >
                Use Current Frame
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<ImageIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedImage && selectedImage !== capturedFrame ? "Change Image" : "Upload Image"}
            </Button>
          </Box>

          {/* Show captured frame preview if available */}
          {capturedFrame && !selectedImage && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: "rgba(0,255,0,0.1)", borderRadius: 1, border: "1px solid rgba(0,255,0,0.3)" }}>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: "bold", display: "block", mb: 1 }}>
                Live camera frame from {capturedFrameTopic}:
              </Typography>
              <Box sx={{ position: "relative", display: "inline-block" }}>
                <img
                  src={capturedFrame}
                  alt="Live camera frame"
                  style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 8, opacity: 0.8 }}
                />
                <Typography variant="caption" sx={{ position: "absolute", bottom: 4, left: 4, bgcolor: "rgba(0,0,0,0.7)", px: 1, borderRadius: 1 }}>
                  Click &quot;Use Current Frame&quot; to select
                </Typography>
              </Box>
            </Box>
          )}

          {/* Show selected image */}
          {selectedImage && (
            <Box sx={{ mt: 1, position: "relative", display: "inline-block" }}>
              <img
                src={selectedImage}
                alt="Selected frame"
                style={{ maxWidth: "100%", maxHeight: 150, borderRadius: 8 }}
              />
              <IconButton
                size="small"
                onClick={() => { setSelectedImage(null); setImageFile(null); }}
                sx={{ position: "absolute", top: 4, right: 4, bgcolor: "rgba(0,0,0,0.5)" }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              {selectedImage === capturedFrame && (
                <Typography variant="caption" sx={{ position: "absolute", bottom: 4, left: 4, bgcolor: "rgba(0,255,0,0.7)", px: 1, borderRadius: 1, color: "black" }}>
                  Using live frame
                </Typography>
              )}
            </Box>
          )}
        </Box>

        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Describe what should happen in the video (e.g., 'The car accelerates and changes lanes to the left while it starts raining')..."
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          startIcon={isGenerating ? <CircularProgress size={20} /> : <PlayArrowIcon />}
          onClick={() => void generateVideo(customPrompt, currentGap?.id)}
          disabled={isGenerating || !customPrompt.trim() || !selectedImage}
        >
          {isGenerating ? "Generating..." : "Generate Video"}
        </Button>

        {!selectedImage && (
          <Typography variant="caption" display="block" color="warning.main" sx={{ mt: 1 }}>
            {capturedFrame
              ? "Click 'Use Current Frame' or upload an image to start"
              : "Please upload a starting frame image (or seek to a timestamp with camera data)"}
          </Typography>
        )}

      </Box>

      {/* Job History */}
      <Box>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Generation History ({simJobs.length})
        </Typography>

        {simJobs.length === 0 ? (
          <Typography color="text.secondary">
            No simulations generated yet. Upload an image and describe a scenario to start.
          </Typography>
        ) : (
          <Stack gap={2}>
            {simJobs.map((job) => (
              <Card key={job.id} sx={{ bgcolor: "background.paper" }}>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {job.prompt.substring(0, 80)}{job.prompt.length > 80 ? "..." : ""}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {job.status === "running" && <CircularProgress size={16} />}
                      {job.status === "completed" && (
                        <Typography color="success.main" variant="body2">Completed</Typography>
                      )}
                      {job.status === "failed" && (
                        <Typography color="error.main" variant="body2">Failed</Typography>
                      )}
                      <IconButton size="small" onClick={() => removeJob(job.id)}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  {job.status === "running" && (
                    <LinearProgress sx={{ mt: 1 }} />
                  )}

                  {job.status === "completed" && job.videoUrl && (
                    <Box sx={{ mt: 2 }}>
                      <video
                        src={job.videoUrl}
                        controls
                        style={{ width: "100%", maxHeight: 300, borderRadius: 8 }}
                      />
                    </Box>
                  )}

                  {job.status === "failed" && job.error && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      {job.error}
                    </Typography>
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
