## Inspiration

Robotics engineers spend countless hours debugging sensor data and identifying gaps in their datasets. When an autonomous system behaves unexpectedly, engineers manually sift through thousands of messages from LiDAR, cameras, IMU, and GPS to understand what happened. When they discover missing scenarios like rain, night conditions, or edge cases, collecting new real-world data is expensive and time-consuming.

We asked: **What if Gemini 3 could be your AI copilot for robotics data analysis?**

## What it does

Aetherion AI is an integrated visualization platform with three AI-powered tools:

### 1. Gap Finder (Gemini 3)
Analyzes your dataset's structure and identifies missing scenarios using Gemini 3's advanced reasoning. It generates actionable prompts for synthetic data generation, turning "you're missing edge cases" into "Car driving on a rainy highway at night."

### 2. Data Simulation (NVIDIA Cosmos Predict2.5)
Captures frames from your sensor data and generates synthetic videos using NVIDIA's Cosmos Predict2.5 Video2World model. Fill dataset gaps without expensive real-world data collection.

### 3. AI Debugger (Gemini 3)
Ask questions about your sensor data in plain English:
- "Why did the robot brake suddenly?"
- "Is the IMU data normal at this timestamp?"
- "What objects are detected ahead?"

Gemini 3 analyzes actual sensor values and provides technical explanations with unprecedented depth and nuance.

## How we built it

- **Frontend**: React, TypeScript, Material-UI
- **Visualization**: Built on Lichtblick, an open-source robotics visualization platform
- **AI Analysis**: Google Gemini 3 API for gap finding and debugging
- **Video Generation**: NVIDIA Cosmos Predict2.5 Video2World (2B parameter model) deployed on HuggingFace Spaces with 4x L40S GPUs
- **Data Formats**: ROS bags, MCAP files

The platform subscribes to sensor topics in real-time, formats structured data for Gemini 3's long context window, and renders AI responses as interactive markdown. We leveraged Gemini 3's:

- **Structured JSON output** for gap analysis cards
- **Long context processing** for full sensor dumps (1000+ lines)
- **Low latency** for real-time debugging responses
- **Advanced reasoning** for root cause analysis

## Challenges we ran into

1. **CUDA/CPU device mismatch**: The Cosmos model had tensor conflicts between GPU and CPU. After multiple iterations, we solved this by explicitly moving all pipeline components to CUDA before each inference call.

2. **Camera prioritization**: With multiple cameras (front, back, left, right), we needed intelligent selection logic to prioritize the front camera for video generation input.

3. **Prompt engineering for simplicity**: Getting Gemini 3 to output simple, actionable prompts for video generation (instead of verbose technical descriptions) required careful prompt design.

4. **Video quality vs. speed tradeoff**: Balancing inference steps and frame count to generate quality videos without excessive wait times on GPU infrastructure.

## Accomplishments that we're proud of

- **Seamless AI integration**: Gemini 3 feels like a natural extension of the robotics workflow, not a bolted-on chatbot
- **End-to-end pipeline**: From identifying gaps to generating prompts to creating synthetic video, all in one interface
- **Real sensor data analysis**: The debugger works with actual sensor values, not just metadata
- **Production-ready**: Deployed Cosmos model on HuggingFace Spaces with proper error handling and device management

## What we learned

- Gemini 3's reasoning capabilities excel at analyzing structured sensor data. It understands robotics concepts out of the box
- Combining multiple AI models (Gemini for analysis, Cosmos for generation) creates powerful workflows that neither could achieve alone
- Real-time sensor data requires careful formatting for LLM consumption. Too much detail overwhelms, too little loses context
- The "AI copilot" paradigm works: engineers ask questions naturally and get actionable answers

## What's next for Aetherion AI

- **More robot platforms**: Expand beyond autonomous vehicles to drones, warehouse robots, surgical robots, and humanoids
- **Gemini 3 Deep Think integration**: For complex debugging scenarios requiring iterative reasoning
- **Simulation environment integration**: Connect with NVIDIA Isaac Sim and Gazebo for closed-loop testing
- **Automated data collection**: Recommend specific real-world scenarios to collect based on gap analysis
- **Multi-agent debugging**: Analyze interactions between multiple robots in shared environments

---

## Built With

- React
- TypeScript
- Material-UI
- Google Gemini 3
- NVIDIA Cosmos Predict2.5
- Lichtblick
- ROS
- Python
- FastAPI
- HuggingFace Spaces
- PyTorch

---

**Built for the Gemini 3 Hackathon by Samuel Donkor**
