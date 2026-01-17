// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<SPDX-License-Identifier: MPL-2.0>
// Aetherion AI Panel - Main Component

import { Tabs, Tab, Box } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import BugReportIcon from "@mui/icons-material/BugReport";
import { useCallback, useEffect, useLayoutEffect, useState, useMemo, useRef } from "react";
import { SettingsTreeAction, SettingsTreeNodes, Topic, MessageEvent, Time } from "@lichtblick/suite";
import Stack from "@lichtblick/suite-base/components/Stack";
import { GapFinderTab } from "./GapFinderTab";
import { SimTab } from "./SimTab";
import { DebuggerTab } from "./DebuggerTab";
import {
  AetherionAIProps,
  AetherionAIConfig,
  TabType,
  GapCard,
  SimulationJob,
  DebugQuery,
  DEFAULT_CONFIG
} from "./types";

// Expanded list of key topics to subscribe to for detailed analysis
const KEY_TOPIC_PATTERNS = [
  // Core vehicle state
  "/pose", "/odom", "/imu", "/gps", "/tf", "/ego_pose", "/vehicle_state",
  "/localization", "/velocity", "/acceleration", "/steering",
  // All camera annotations
  "/CAM_FRONT/annotations", "/CAM_BACK/annotations",
  "/CAM_FRONT_LEFT/annotations", "/CAM_FRONT_RIGHT/annotations",
  "/CAM_BACK_LEFT/annotations", "/CAM_BACK_RIGHT/annotations",
  // Camera images (for frame capture)
  "/CAM_FRONT/image_rect_compressed", "/CAM_FRONT/image",
  "/image", "/camera/image", "/image_raw", "/image_rect",
  // LiDAR data
  "/LIDAR_TOP", "/lidar", "/points", "/pointcloud",
  // All radar sensors
  "/RADAR_FRONT", "/RADAR_FRONT_LEFT", "/RADAR_FRONT_RIGHT",
  "/RADAR_BACK_LEFT", "/RADAR_BACK_RIGHT", "/radar",
  // Diagnostics and system state
  "/diagnostics", "/drivable_area", "/map", "/semantic_map",
  // Control signals
  "/brake", "/throttle", "/control", "/command",
  // Object detection
  "/objects", "/tracks", "/obstacles", "/markers",
];

// Camera topic patterns to look for (image types)
const CAMERA_IMAGE_PATTERNS = [
  "image_rect_compressed", "image_compressed", "image_raw", "image_rect", "/image"
];

// Priority order for camera selection (front cameras first)
const CAMERA_PRIORITY = [
  "cam_front/",
  "front_camera",
  "camera_front",
  "/front/",
  "cam_back/",  // back is better than side for driving context
  "camera/",
  "cam_left",
  "cam_right",
];

// Helper to safely stringify data with depth limit
function safeStringify(obj: unknown, maxDepth = 3, currentDepth = 0): string {
  if (currentDepth >= maxDepth) return "[...]";
  if (obj === null) return "null";
  if (obj === undefined) return "undefined";
  if (typeof obj === "string") return obj.length > 200 ? obj.substring(0, 200) + "..." : obj;
  if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return "[]";
    if (obj.length > 5) return `[${obj.slice(0, 5).map(item => safeStringify(item, maxDepth, currentDepth + 1)).join(", ")}, ... (${obj.length} items)]`;
    return `[${obj.map(item => safeStringify(item, maxDepth, currentDepth + 1)).join(", ")}]`;
  }
  if (typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    const limited = entries.slice(0, 10);
    const formatted = limited.map(([k, v]) => `${k}: ${safeStringify(v, maxDepth, currentDepth + 1)}`).join(", ");
    return entries.length > 10 ? `{${formatted}, ... (${entries.length} keys)}` : `{${formatted}}`;
  }
  return String(obj);
}

export function AetherionAI({ context }: AetherionAIProps): React.JSX.Element {
  const [renderDone, setRenderDone] = useState<() => void>(() => () => {});
  const [config, setConfig] = useState<AetherionAIConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...(context.initialState as Partial<AetherionAIConfig>),
    geminiApiKey: (context.initialState as Partial<AetherionAIConfig>)?.geminiApiKey || "AIzaSyCabeY7Vxa-d9qkBkb6x7uin1Z9xpXJoaE",
  }));

  const [topics, setTopics] = useState<readonly Topic[]>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState<Time | undefined>(undefined);
  const [startTime, setStartTime] = useState<Time | undefined>(undefined);
  const [currentFrameMessages, setCurrentFrameMessages] = useState<readonly MessageEvent[]>([]);
  const [currentGapForSim, setCurrentGapForSim] = useState<GapCard | null>(null);
  const [currentCameraFrame, setCurrentCameraFrame] = useState<string | null>(null);
  const [cameraTopicName, setCameraTopicName] = useState<string | null>(null);

  // Track subscribed topics
  const subscribedTopicsRef = useRef(new Set<string>());

  // Subscribe to relevant topics when they become available
  useEffect(() => {
    if (topics.length === 0) return;

    const topicsToSubscribe: string[] = [];
    const currentSubscribed = subscribedTopicsRef.current;

    for (const topic of topics) {
      // Check if this topic matches any of our key patterns
      const shouldSubscribe = KEY_TOPIC_PATTERNS.some(pattern =>
        topic.name.toLowerCase().includes(pattern.toLowerCase()) ||
        topic.name === pattern
      );

      if (shouldSubscribe && !currentSubscribed.has(topic.name)) {
        topicsToSubscribe.push(topic.name);
        currentSubscribed.add(topic.name);
      }
    }

    if (topicsToSubscribe.length > 0) {
      context.subscribe(topicsToSubscribe.map(topic => ({ topic })));
    }
  }, [topics, context]);

  // Setup context render handler - must use useLayoutEffect to set up before first render
  useLayoutEffect(() => {
    context.watch("topics");
    context.watch("currentFrame");
    context.watch("currentTime");
    context.watch("startTime");
    context.watch("endTime");

    context.onRender = (renderState, done) => {
      setRenderDone(() => done);

      // Get topics from render state
      if (renderState.topics) {
        setTopics(renderState.topics);
        setMessageCount(renderState.topics.length);
      }

      // Get current time
      if (renderState.currentTime) {
        setCurrentTime(renderState.currentTime);
      }

      // Get start time for relative time calculation
      if (renderState.startTime) {
        setStartTime(renderState.startTime);
      }

      // Get ALL current frame messages (from subscribed topics)
      if (renderState.currentFrame && renderState.currentFrame.length > 0) {
        setCurrentFrameMessages(renderState.currentFrame);

        // Extract camera image - prioritize front cameras
        // First, collect all camera messages
        const cameraMessages: { msg: MessageEvent; priority: number }[] = [];

        for (const msg of renderState.currentFrame) {
          const topicLower = msg.topic.toLowerCase();
          const isCameraImage = CAMERA_IMAGE_PATTERNS.some(pattern =>
            topicLower.includes(pattern.toLowerCase())
          );

          if (isCameraImage) {
            // Determine priority (lower = higher priority)
            let priority = CAMERA_PRIORITY.length; // Default to lowest priority
            for (let i = 0; i < CAMERA_PRIORITY.length; i++) {
              if (topicLower.includes(CAMERA_PRIORITY[i]!)) {
                priority = i;
                break;
              }
            }
            cameraMessages.push({ msg, priority });
          }
        }

        // Sort by priority and use the best one
        if (cameraMessages.length > 0) {
          cameraMessages.sort((a, b) => a.priority - b.priority);
          const bestCamera = cameraMessages[0]!.msg;
          const msgData = bestCamera.message as Record<string, unknown>;

          // Handle compressed image (sensor_msgs/CompressedImage)
          if (msgData["data"]) {
            const imageData = msgData["data"];
            const format = msgData["format"] as string || "jpeg";

            if (imageData instanceof Uint8Array) {
              // Convert Uint8Array to base64
              let binary = "";
              for (let i = 0; i < imageData.length; i++) {
                binary += String.fromCharCode(imageData[i]!);
              }
              const base64 = btoa(binary);
              setCurrentCameraFrame(`data:image/${format};base64,${base64}`);
              setCameraTopicName(bestCamera.topic);
            } else if (typeof imageData === "string") {
              // Already base64 encoded
              setCurrentCameraFrame(`data:image/${format};base64,${imageData}`);
              setCameraTopicName(bestCamera.topic);
            }
          }
        }
      }

      // Get duration from startTime and endTime
      if (renderState.startTime && renderState.endTime) {
        const startSec = renderState.startTime.sec + renderState.startTime.nsec / 1e9;
        const endSec = renderState.endTime.sec + renderState.endTime.nsec / 1e9;
        setDuration(endSec - startSec);
      }
    };

    return () => {
      context.onRender = undefined;
    };
  }, [context]);

  // Save config updates
  useEffect(() => {
    context.saveState(config);
  }, [config, context]);

  // Settings panel
  useEffect(() => {
    const settingsTree: SettingsTreeNodes = {
      general: {
        label: "General",
        fields: {
          geminiApiKey: {
            label: "Gemini API Key",
            input: "string",
            value: config.geminiApiKey,
          },
          cosmosEndpoint: {
            label: "Simulation Endpoint",
            input: "string",
            value: config.cosmosEndpoint,
          },
        },
      },
    };

    context.updatePanelSettingsEditor({
      actionHandler: (action: SettingsTreeAction) => {
        if (action.action === "update") {
          const path = action.payload.path;
          const value = action.payload.value;

          if (path[1] === "geminiApiKey") {
            setConfig(prev => ({ ...prev, geminiApiKey: value as string }));
          } else if (path[1] === "cosmosEndpoint") {
            setConfig(prev => ({ ...prev, cosmosEndpoint: value as string }));
          }
        }
      },
      nodes: settingsTree,
    });
  }, [context, config.geminiApiKey, config.cosmosEndpoint]);

  // Signal render complete
  useEffect(() => {
    renderDone();
  }, [renderDone]);

  // Tab handlers
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: TabType) => {
    setConfig(prev => ({ ...prev, activeTab: newValue }));
  }, []);

  const handleGapsUpdate = useCallback((gaps: GapCard[]) => {
    setConfig(prev => ({ ...prev, gaps }));
  }, []);

  const handleSimulateGap = useCallback((gap: GapCard) => {
    setCurrentGapForSim(gap);
    setConfig(prev => ({ ...prev, activeTab: "sim" }));
  }, []);

  const handleSimJobsUpdate = useCallback((simJobs: SimulationJob[]) => {
    setConfig(prev => ({ ...prev, simJobs }));
  }, []);

  const handleDebugHistoryUpdate = useCallback((debugHistory: DebugQuery[]) => {
    setConfig(prev => ({ ...prev, debugHistory }));
  }, []);

  // Seek to a specific timestamp (relative to start)
  const handleSeekTo = useCallback((relativeSeconds: number) => {
    if (!startTime) return;
    const targetTime: Time = {
      sec: startTime.sec + Math.floor(relativeSeconds),
      nsec: startTime.nsec + Math.floor((relativeSeconds % 1) * 1e9),
    };
    // Normalize nsec overflow
    if (targetTime.nsec >= 1e9) {
      targetTime.sec += 1;
      targetTime.nsec -= 1e9;
    }
    context.seekPlayback?.(targetTime);
  }, [context, startTime]);

  // Convert Topic objects to string names for child components
  const topicNames = useMemo(() => topics.map(t => t.name), [topics]);

  // Calculate relative current time
  const relativeTime = useMemo(() => {
    if (!currentTime || !startTime) return 0;
    const currentSec = currentTime.sec + currentTime.nsec / 1e9;
    const startSec = startTime.sec + startTime.nsec / 1e9;
    return currentSec - startSec;
  }, [currentTime, startTime]);

  // Format vector3 nicely
  const formatVector3 = (v: unknown): string => {
    if (!v || typeof v !== "object") return "N/A";
    const vec = v as Record<string, unknown>;
    const x = typeof vec["x"] === "number" ? vec["x"].toFixed(4) : "?";
    const y = typeof vec["y"] === "number" ? vec["y"].toFixed(4) : "?";
    const z = typeof vec["z"] === "number" ? vec["z"].toFixed(4) : "?";
    return `(x:${x}, y:${y}, z:${z})`;
  };

  // Format quaternion nicely
  const formatQuaternion = (q: unknown): string => {
    if (!q || typeof q !== "object") return "N/A";
    const quat = q as Record<string, unknown>;
    const w = typeof quat["w"] === "number" ? quat["w"].toFixed(4) : "?";
    const x = typeof quat["x"] === "number" ? quat["x"].toFixed(4) : "?";
    const y = typeof quat["y"] === "number" ? quat["y"].toFixed(4) : "?";
    const z = typeof quat["z"] === "number" ? quat["z"].toFixed(4) : "?";
    return `(w:${w}, x:${x}, y:${y}, z:${z})`;
  };

  // Build detailed frame data summary for AI
  const frameDataSummary = useMemo(() => {
    if (currentFrameMessages.length === 0) return "";

    const summaries: string[] = [];
    for (const msg of currentFrameMessages) {
      const topicName = msg.topic;
      const data = msg.message as Record<string, unknown>;

      // Create sensor-specific formatted summaries
      let dataSummary = "";
      const topicLower = topicName.toLowerCase();

      if (topicLower.includes("pose") || topicLower.includes("odom") || topicLower.includes("ego")) {
        const pose = data["pose"] as Record<string, unknown> | undefined;
        const position = data["position"] ?? pose?.["position"] ?? (pose?.["pose"] as Record<string, unknown>)?.["position"];
        const orientation = data["orientation"] ?? pose?.["orientation"] ?? (pose?.["pose"] as Record<string, unknown>)?.["orientation"];
        const twist = data["twist"] as Record<string, unknown> | undefined;
        const linearVel = twist?.["linear"] ?? data["linear"];
        const angularVel = twist?.["angular"] ?? data["angular"];
        dataSummary = `pos:${formatVector3(position)}, orient:${formatQuaternion(orientation)}`;
        if (linearVel) dataSummary += `, vel:${formatVector3(linearVel)}`;
        if (angularVel) dataSummary += `, ang_vel:${formatVector3(angularVel)}`;

      } else if (topicLower.includes("imu")) {
        const linearAccel = data["linear_acceleration"];
        const angularVel = data["angular_velocity"];
        const orientation = data["orientation"];
        dataSummary = `accel:${formatVector3(linearAccel)}, gyro:${formatVector3(angularVel)}`;
        if (orientation) dataSummary += `, orient:${formatQuaternion(orientation)}`;

      } else if (topicLower.includes("gps")) {
        const lat = data["latitude"] ?? data["lat"];
        const lon = data["longitude"] ?? data["lon"];
        const alt = data["altitude"] ?? data["alt"];
        dataSummary = `lat:${lat}, lon:${lon}, alt:${alt}`;

      } else if (topicLower.includes("annotation")) {
        const points = data["points"] as unknown[] | undefined;
        const numDetections = Array.isArray(points) ? points.length : 0;
        dataSummary = `${numDetections} detection points`;

      } else if (topicLower.includes("radar") || topicLower.includes("lidar") || topicLower.includes("point")) {
        // Point cloud data - show point count
        const pointData = data["data"] ?? data["points"] ?? data["fields"];
        if (Array.isArray(pointData)) {
          dataSummary = `${pointData.length} points`;
        } else if (data["width"] && data["height"]) {
          dataSummary = `${data["width"]}x${data["height"]} points`;
        } else {
          dataSummary = safeStringify(data, 2);
        }

      } else if (topicLower.includes("diagnostic")) {
        const status = data["status"] as unknown[] | undefined;
        if (Array.isArray(status) && status.length > 0) {
          const first = status[0] as Record<string, unknown>;
          dataSummary = `${first["name"]}: ${first["message"]} (level:${first["level"]})`;
        } else {
          dataSummary = `level:${data["level"]}, msg:${data["message"]}`;
        }

      } else if (topicLower.includes("tf")) {
        const transforms = data["transforms"] as unknown[] | undefined;
        if (Array.isArray(transforms) && transforms.length > 0) {
          const tf = transforms[0] as Record<string, unknown>;
          const header = tf["header"] as Record<string, unknown> | undefined;
          const childFrame = tf["child_frame_id"];
          const parentFrame = header?.["frame_id"];
          dataSummary = `${parentFrame} -> ${childFrame}`;
        } else {
          dataSummary = safeStringify(data, 2);
        }

      } else if (topicLower.includes("velocity") || topicLower.includes("twist")) {
        const linear = data["linear"];
        const angular = data["angular"];
        dataSummary = `linear:${formatVector3(linear)}, angular:${formatVector3(angular)}`;

      } else if (topicLower.includes("brake") || topicLower.includes("throttle") || topicLower.includes("steering")) {
        const value = data["data"] ?? data["value"] ?? data["position"];
        dataSummary = `value: ${value}`;

      } else {
        dataSummary = safeStringify(data, 2);
      }

      summaries.push(`[${topicName}] ${dataSummary}`);
    }

    return summaries.join("\n");
  }, [currentFrameMessages]);

  const subscribedCount = subscribedTopicsRef.current.size;

  const topicInfo = useMemo(() => ({
    topics: topicNames,
    messageCount,
    duration,
    currentTime: relativeTime,
    frameData: frameDataSummary,
    subscribedCount,
    onSeekTo: handleSeekTo,
  }), [topicNames, messageCount, duration, relativeTime, frameDataSummary, subscribedCount, handleSeekTo]);

  return (
    <Stack fullHeight style={{ background: "#121212" }}>
      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "#1a1a1a" }}>
        <Tabs
          value={config.activeTab}
          onChange={handleTabChange}
          sx={{
            "& .MuiTab-root": {
              minHeight: 48,
              textTransform: "none",
            },
          }}
        >
          <Tab
            value="gapFinder"
            icon={<SearchIcon />}
            iconPosition="start"
            label="Gap Finder"
          />
          <Tab
            value="sim"
            icon={<VideoLibraryIcon />}
            iconPosition="start"
            label="Sim"
          />
          <Tab
            value="debugger"
            icon={<BugReportIcon />}
            iconPosition="start"
            label="Debugger"
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Stack fullHeight style={{ overflow: "hidden" }}>
        {config.activeTab === "gapFinder" && (
          <GapFinderTab
            gaps={config.gaps}
            onGapsUpdate={handleGapsUpdate}
            onSimulateGap={handleSimulateGap}
            geminiApiKey={config.geminiApiKey}
            topicInfo={topicInfo}
          />
        )}
        {config.activeTab === "sim" && (
          <SimTab
            simJobs={config.simJobs}
            onJobsUpdate={handleSimJobsUpdate}
            currentGap={currentGapForSim}
            cosmosEndpoint={config.cosmosEndpoint}
            capturedFrame={currentCameraFrame}
            capturedFrameTopic={cameraTopicName}
          />
        )}
        {config.activeTab === "debugger" && (
          <DebuggerTab
            debugHistory={config.debugHistory}
            onHistoryUpdate={handleDebugHistoryUpdate}
            geminiApiKey={config.geminiApiKey}
            topicInfo={topicInfo}
          />
        )}
      </Stack>
    </Stack>
  );
}
