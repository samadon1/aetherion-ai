// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { LayoutData } from "@lichtblick/suite-base/context/CurrentLayoutContext/actions";
import { defaultPlaybackConfig } from "@lichtblick/suite-base/providers/CurrentLayoutProvider/reducers";

/**
 * Overridden default layout that may have been provided when self-hosting via Docker
 * */
const staticDefaultLayout = (globalThis as { LICHTBLICK_SUITE_DEFAULT_LAYOUT?: LayoutData })
  .LICHTBLICK_SUITE_DEFAULT_LAYOUT;

/**
 * This is loaded when the user has no layout selected on application launch
 * to avoid presenting the user with a blank layout.
 */
export const defaultLayout: LayoutData =
  staticDefaultLayout ??
  ({
    configById: {
      "Image!3vh4ctn": {
        cameraState: {
          distance: 20,
          perspective: true,
          phi: 60,
          target: [0, 0, 0],
          targetOffset: [0, 0, 0],
          targetOrientation: [0, 0, 0, 1],
          thetaOffset: 45,
          fovy: 45,
          near: 0.5,
          far: 5000,
        },
        followMode: "follow-pose",
        scene: {},
        transforms: {},
        topics: {},
        layers: {},
        publish: {
          type: "point",
          poseTopic: "/move_base_simple/goal",
          pointTopic: "/clicked_point",
          poseEstimateTopic: "/initialpose",
          poseEstimateXDeviation: 0.5,
          poseEstimateYDeviation: 0.5,
          poseEstimateThetaDeviation: 0.26179939,
        },
        imageMode: {},
      },
      "3D!18i6zy7": {
        layers: {
          "845139cb-26bc-40b3-8161-8ab60af4baf5": {
            visible: true,
            frameLocked: true,
            label: "Grid",
            instanceId: "845139cb-26bc-40b3-8161-8ab60af4baf5",
            layerId: "foxglove.Grid",
            size: 10,
            divisions: 10,
            lineWidth: 1,
            color: "#248eff",
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            order: 1,
          },
        },
        cameraState: {
          perspective: true,
          distance: 16.29,
          phi: 69.15,
          thetaOffset: 80.77,
          targetOffset: [2.18, 0.62, 0],
          target: [0, 0, 0],
          targetOrientation: [0, 0, 0, 1],
          fovy: 45,
          near: 0.5,
          far: 5000,
        },
        followMode: "follow-pose",
        followTf: "base_link",
        scene: {
          enableStats: false,
        },
        transforms: {},
        topics: {},
        publish: {
          type: "point",
          poseTopic: "/move_base_simple/goal",
          pointTopic: "/clicked_point",
          poseEstimateTopic: "/initialpose",
          poseEstimateXDeviation: 0.5,
          poseEstimateYDeviation: 0.5,
          poseEstimateThetaDeviation: 0.26179939,
        },
        imageMode: {},
      },
      "AetherionAI!2a6bcb6": {
        activeTab: "gapFinder",
        geminiApiKey: "",
        cosmosEndpoint: "",
        gaps: [],
        simJobs: [],
        debugHistory: [],
      },
    },
    globalVariables: {},
    userNodes: {},
    playbackConfig: { ...defaultPlaybackConfig },
    layout: {
      direction: "row",
      first: "Image!3vh4ctn",
      second: {
        first: "3D!18i6zy7",
        second: "AetherionAI!2a6bcb6",
        direction: "row",
        splitPercentage: 69,
      },
      splitPercentage: 30,
    },
  } as const);
