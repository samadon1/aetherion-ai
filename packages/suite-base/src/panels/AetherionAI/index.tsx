// SPDX-FileCopyrightText: Copyright (C) 2023-2024 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<SPDX-License-Identifier: MPL-2.0>
// Aetherion AI Panel - Entry Point

import { useMemo } from "react";
import { useCrash } from "@lichtblick/hooks";
import { PanelExtensionContext } from "@lichtblick/suite";
import { CaptureErrorBoundary } from "@lichtblick/suite-base/components/CaptureErrorBoundary";
import Panel from "@lichtblick/suite-base/components/Panel";
import { PanelExtensionAdapter } from "@lichtblick/suite-base/components/PanelExtensionAdapter";
import { createSyncRoot } from "@lichtblick/suite-base/panels/createSyncRoot";
import ThemeProvider from "@lichtblick/suite-base/theme/ThemeProvider";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";

import { AetherionAI } from "./AetherionAI";
import { AetherionAIConfig, DEFAULT_CONFIG } from "./types";

function initPanel(crash: ReturnType<typeof useCrash>, context: PanelExtensionContext) {
  return createSyncRoot(
    <CaptureErrorBoundary onError={crash}>
      <ThemeProvider isDark>
        <AetherionAI context={context} />
      </ThemeProvider>
    </CaptureErrorBoundary>,
    context.panelElement,
  );
}

type Props = {
  config: AetherionAIConfig;
  saveConfig: SaveConfig<AetherionAIConfig>;
};

function AetherionAIPanelAdapter(props: Props) {
  const crash = useCrash();
  const boundInitPanel = useMemo(() => initPanel.bind(undefined, crash), [crash]);

  return (
    <PanelExtensionAdapter
      config={props.config}
      saveConfig={props.saveConfig}
      initPanel={boundInitPanel}
      highestSupportedConfigVersion={1}
    />
  );
}

AetherionAIPanelAdapter.panelType = "AetherionAI";
AetherionAIPanelAdapter.defaultConfig = DEFAULT_CONFIG;

export default Panel(AetherionAIPanelAdapter);
