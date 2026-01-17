# Aetherion AI

AI-powered robotics data visualization and analysis platform for autonomous vehicles.

<p align="center">
  <img alt="Aetherion AI screenshot" src="resources/screenshot.png">
</p>

## Features

### AetherionAI Panel
A custom panel with three integrated tools:

- **Gap Finder**: AI-powered analysis of missing driving scenarios using Gemini. Identifies gaps in your dataset coverage and suggests synthetic data to generate.

- **Data Simulation**: Generate synthetic driving videos using NVIDIA Cosmos Predict2 (Video2World). Capture frames from your data and create simulated scenarios.

- **Debugger**: AI assistant for analyzing sensor data and debugging issues. Ask natural language questions about your data and get detailed analysis.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/samadon1/aetherion-ai.git
cd aetherion-ai

# Enable corepack
corepack enable

# Install dependencies
yarn install

# Start development server
yarn web:serve
```

Open http://localhost:8080 in your browser.

## Configuration

In the AetherionAI panel settings, configure:
- **Gemini API Key**: For Gap Finder and Debugger AI analysis
- **Simulation Endpoint**: Cosmos Predict2 API endpoint for video generation

## Built On

This project is built on [Lichtblick](https://github.com/Lichtblick-Suite/lichtblick), an open-source robotics visualization tool. Lichtblick itself originated as a fork of [Foxglove Studio](https://github.com/foxglove/studio).

## License

Mozilla Public License 2.0 (MPL-2.0)
