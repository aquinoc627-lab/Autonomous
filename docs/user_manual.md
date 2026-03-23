# Autonomous: Comprehensive User Manual

Welcome to Autonomous, your advanced platform for autonomous agent orchestration, mission management, and real-time collaboration. This manual provides a detailed overview of all features, from core functionalities to advanced AI integrations, helping you harness the full power of your intelligent Autonomous.

## 1. Introduction to Autonomous

The Autonomous is designed to manage and coordinate a team of intelligent agents, enabling them to execute complex missions, communicate autonomously, and learn from past experiences. Featuring a neon-themed, responsive dashboard, it provides a centralized command center for all your autonomous operations.

## 2. Core Entities

The platform revolves around three primary entities:

### 2.1. Missions

**Missions** are tasks assigned to agents. They have a `name`, `description`, `status` (e.g., `pending`, `in_progress`, `completed`, `failed`), and `priority` (e.g., `low`, `medium`, `high`, `critical`). Missions can be assigned to one or more agents, and can also be broken down into hierarchical sub-tasks for collaborative execution by Autonomous.

### 2.2. Agents

**Agents** are the autonomous entities within Autonomous. Each agent possesses a unique `name`, `status` (e.g., `idle`, `active`, `thinking`, `error`), and a distinct `persona` that dictates its behavior, voice, and visual representation. Agents can be assigned multiple missions and are capable of autonomous reasoning, tool use, and inter-agent communication.

### 2.3. Banter

**Banter** represents the real-time communication feed within Autonomous. It includes messages from users, agents, and system notifications. Banter messages can be filtered by mission or agent, providing contextual communication streams. Agents use the Banter feed to report progress, share findings, and collaborate.

## 3. Dashboard Components

The Autonomous dashboard is organized into several key components, each providing a unique view and set of controls for managing your autonomous operations.

### 3.1. Autonomous View

The **Autonomous View** provides an overview and visual status of all active agents and missions. It features:
*   **Agent Grid**: Displays 3D animated hologram characters for each agent, dynamically reflecting their status (idle, speaking, thinking) and persona.
*   **Mission Overview**: Summarizes active missions, their statuses, and assigned agents.
*   **Collaboration Graph**: A visual representation of hierarchical missions and agent-to-agent task delegations, showing how Autonomous is working together.

### 3.2. Mission Timeline

The **Mission Timeline** allows you to display and manage missions chronologically or by status. Here you can:
*   View all missions with their current status and priority.
*   Create, update, or delete missions.
*   Assign or revoke missions for specific agents.
*   Break down complex missions into sub-tasks for delegation.

### 3.3. Banter Panel

The **Banter Panel** is the real-time chat and message feed. It supports:
*   **Real-time Updates**: Messages appear instantly from users, agents, and system events.
*   **Filtering**: Filter messages by specific missions or agents to focus on relevant conversations.
*   **Compose/Send**: Send messages to the entire Autonomous or specific agents.
*   **Agent Speech**: Click the speaker icon next to an agent's message to hear them speak in their unique persona voice.

### 3.4. Agent Control

**Agent Control** provides full CRUD (Create, Read, Update, Delete) functionality for managing your agents. Key features include:
*   **Agent Cards**: Each agent is represented by a card showing its 3D hologram, status, and assigned missions.
*   **Assign/Revoke Missions**: Easily manage mission assignments for each agent.
*   **Trigger Brain**: Manually prompt an agent to reason and act immediately.

### 3.5. Tool Arsenal

The **Tool Arsenal** is a dedicated interface for browsing and managing the platform's cybersecurity capabilities:
*   **Interactive Catalog**: Browse tools by category, search by name, or filter by supported OS and severity level.
*   **Command Generation**: Select a tool, fill in the required parameters (e.g., target IP, scan type), and the platform will securely generate the exact command needed for execution.
*   **Agent Assignment**: Directly assign a generated tool command to a specific agent for execution as part of a mission.

### 3.6. Analytics Widgets

The **Analytics Widgets** provide advanced insights into Autonomous's performance and system health. This includes:
*   **Activity Graphs**: Visualize mission and agent activity over time.
*   **System Health**: Monitor key metrics like agent availability, mission completion rates, and WebSocket connection counts.
*   **Banter Distribution**: See trends in message types and agent communication patterns.

## 4. Advanced Features

The Autonomous integrates several cutting-edge AI capabilities to enhance agent autonomy and intelligence.

### 4.1. Agent Brain (Gemini-Powered Reasoning)

The **Agent Brain** is the core intelligence layer, powered by the Gemini API. It enables agents to:
*   **Autonomous Reasoning**: Agents analyze their assigned missions, current context, and Banter feed to make decisions.
*   **Persona-Driven Actions**: Each agent acts and communicates according to its unique persona (e.g., "Stealthy & Precise", "Analytical & Logical").
*   **Autonomous Mode**: A global toggle (accessible via the Notification Center) that enables agents to act and communicate without direct user intervention.

### 4.2. Real-World Agency & Tool Arsenal

Agents are equipped with a comprehensive **Tool Arsenal** and execution engine, allowing them to interact with the external world and perform advanced cybersecurity operations:
*   **Curated Tool Catalog**: Access to 44+ pre-configured pen testing and cybersecurity tools across 10 categories (Recon, Web, Exploitation, Passwords, OSINT, Wireless, Network, Post-Exploitation, Darknet, AI Ops).
*   **OS-Aware Execution**: Tools automatically generate the correct command syntax for the target environment (Linux, Windows, or Android).
*   **Security & Confirmation Gates**: Tools are categorized by severity (`info`, `warning`, `danger`). Dangerous tools (like Metasploit or Cobalt Strike) require explicit admin confirmation before execution, preventing accidental destructive actions.
*   **Web Search & Content Fetching**: Agents can perform real-time internet searches and fetch content from URLs to gather intelligence.
*   **Autonomous Mission Execution**: Agents use these tools to complete missions (e.g., researching a topic, analyzing a website, running a vulnerability scan) and report their findings back to the Banter feed.

### 4.3. Voice Interaction

The "Jarvis" Voice Interaction layer provides a natural language interface for Autonomous:
*   **Voice Commands**: Use the microphone widget to control the dashboard (e.g., "Show Missions", "Assign mission X to Agent Y").
*   **Agent Speech**: Agents can speak their Banter messages using unique, persona-matched voices. Click the speaker icon next to any agent message to hear it.
*   **Audio Visualizations**: Agent holograms visually react to speech and listening states.

### 4.4. Autonomous Intelligence (Agent-to-Agent Collaboration)

This feature enables agents to work together on complex tasks:
*   **Hierarchical Tasking**: A "Commander" agent can break down a large mission into smaller sub-tasks and delegate them to other "Specialist" agents.
*   **Cross-Agent Communication**: Agents can communicate directly with each other in the Banter feed to coordinate efforts and share information.
*   **Collaboration Graph**: Visualize the delegation and communication flow between agents in Autonomous View.

### 4.5. Memory Palace (Long-Term Vector Memory)

The **Memory Palace** provides agents with persistent, semantic long-term memory:
*   **ChromaDB Integration**: All significant mission data, code snippets, and Banter conversations are indexed into a vector database.
*   **Semantic Recall**: Agents can semantically search and retrieve past experiences and knowledge to inform current decision-making.
*   **Memory Search UI**: A dedicated search interface (accessible via the brain icon in the top bar) allows users to query Autonomous's collective memory using natural language.

### 4.6. Autonomous Coding (DevOps Agent)

This feature empowers agents to interact with code and development workflows:
*   **Secure Code Sandbox**: Agents can execute Python code and shell commands in a safe, isolated environment.
*   **GitHub Integration**: Agents can fetch code, analyze repositories, and propose fixes or new features via Pull Requests.
*   **Engineer Persona**: A specialized agent persona (`Architect-Sigma`) is available for coding, debugging, and system design tasks.
*   **Live Terminal & Code Diff**: New UI components to view real-time code execution output and visualize proposed code changes.

### 4.7. 3D Agent Lab (Custom Agent Creator)

The **Agent Lab** is a dedicated interface for creating and customizing your agents:
*   **3D Hologram Preview**: Design new agents with a real-time 3D preview of their animated human-like hologram.
*   **Persona Configuration**: Define their name, role, personality, voice style, and visual attributes (hologram color, orbiting icon).
*   **Instant Deployment**: Deploy newly created agents directly to your live Autonomous.

## 5. Authentication and Authorization

The Autonomous supports robust authentication and authorization:
*   **JWT (JSON Web Tokens)**: Default authentication mechanism with secure access and refresh token rotation.
*   **OAuth (Optional)**: Configurable to integrate with external OIDC providers like Auth0 or Okta.
*   **Role-Based Access Control (RBAC)**: Users are assigned roles (e.g., `admin`, `operator`) which dictate their permissions and access to certain features.

## 6. Troubleshooting

Refer to the `windows_installation_guide.md` or `DEPLOYMENT.md` for specific troubleshooting steps related to installation and deployment. For general issues:
*   **Check Backend Logs**: Monitor the backend console or `/tmp/uvicorn.log` for FastAPI errors.
*   **Check Browser Console**: Look for JavaScript errors or API call failures in your browser's developer console.
*   **Verify API Connectivity**: Ensure the frontend can reach the backend API (e.g., `http://localhost:8000`).
*   **Restart Services**: Often, restarting the backend and frontend services can resolve transient issues.

---

## References

[1] Autonomous GitHub Repository | [https://github.com/aquinoc627-lab/autonomous](https://github.com/aquinoc627-lab/autonomous)
