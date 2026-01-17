// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<SPDX-License-Identifier: MPL-2.0>
// Aetherion AI Panel Types

import { PanelExtensionContext } from "@lichtblick/suite";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";

export type TabType = "gapFinder" | "sim" | "debugger";

export type GapCard = {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
  category: string;
  suggestedAction: string;
  dataToGenerate?: string;
};

export type SimulationJob = {
  id: string;
  gapId: string;
  prompt: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
  videoUrl?: string;
  error?: string;
};

export type DebugQuery = {
  id: string;
  question: string;
  answer?: string;
  timestamp: number;
  status: "pending" | "completed" | "failed";
};

export type AetherionAIConfig = {
  activeTab: TabType;
  geminiApiKey: string;
  cosmosEndpoint: string;
  gaps: GapCard[];
  simJobs: SimulationJob[];
  debugHistory: DebugQuery[];
};

export type AetherionAIProps = {
  context: PanelExtensionContext;
};

export type AetherionAIPanelAdapterProps = {
  config: AetherionAIConfig;
  saveConfig: SaveConfig<AetherionAIConfig>;
};

export const DEFAULT_CONFIG: AetherionAIConfig = {
  activeTab: "gapFinder",
  geminiApiKey: "",
  cosmosEndpoint: "https://huggingface.co/spaces/samwell/cosmos-predict2-space",
  gaps: [],
  simJobs: [],
  debugHistory: [],
};
