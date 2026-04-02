<div align="center">
  <img src="assets/icon.png" alt="DBAT logo" width="96" />
  <h1>Developer Behavior Analytics Tool</h1>
  <p>Desktop analytics for local Git repositories and GitHub activity.</p>

  <p>
    <a href="https://github.com/kspeiris/Developer-Behavior-Analytics-Tool/graphs/contributors">
      <img src="https://img.shields.io/github/contributors/kspeiris/Developer-Behavior-Analytics-Tool" alt="Contributors" />
    </a>
    <a href="https://github.com/kspeiris/Developer-Behavior-Analytics-Tool/commits/main">
      <img src="https://img.shields.io/github/last-commit/kspeiris/Developer-Behavior-Analytics-Tool" alt="Last commit" />
    </a>
    <a href="https://github.com/kspeiris/Developer-Behavior-Analytics-Tool/network/members">
      <img src="https://img.shields.io/github/forks/kspeiris/Developer-Behavior-Analytics-Tool" alt="Forks" />
    </a>
    <a href="https://github.com/kspeiris/Developer-Behavior-Analytics-Tool/stargazers">
      <img src="https://img.shields.io/github/stars/kspeiris/Developer-Behavior-Analytics-Tool" alt="Stars" />
    </a>
    <a href="https://github.com/kspeiris/Developer-Behavior-Analytics-Tool/issues">
      <img src="https://img.shields.io/github/issues/kspeiris/Developer-Behavior-Analytics-Tool" alt="Issues" />
    </a>
    <a href="https://github.com/kspeiris/Developer-Behavior-Analytics-Tool/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/kspeiris/Developer-Behavior-Analytics-Tool.svg" alt="License" />
    </a>
  </p>
</div>

System build: [https://drive.google.com/file/d/1F3r6xgSdaQ0aMJjVSMTh2bYd5bD9sg4h/view?usp=sharing](https://drive.google.com/drive/folders/1PwmbJrqtXlhvQ6vYN3rkRPbO4YAA1KZt?usp=sharing)

![DBAT hero](hero_DBAT.png)

## Table of Contents

- [About](#about)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## About

DBAT is a desktop application for analyzing developer activity from local Git repositories and GitHub accounts. It helps surface commit patterns, code churn, active days, hotspots, and other productivity signals in a single interface.

## Screenshots

![Dashboard 1](DBAT1.png)
![Dashboard 2](DBAT2.png)
![Dashboard 3](DBAT3.png)
![Dashboard 4](DBAT4.png)

## Tech Stack

- React
- TypeScript
- Vite
- Electron
- Tailwind CSS
- Recharts
- better-sqlite3

## Features

- Local repository analysis
- GitHub account analysis
- Dashboard cards and charts
- Top modified files and churn tracking
- Markdown report export
- Saved projects
- Recent repository history

## System Architecture

```mermaid
flowchart LR
    U[User] --> R[React Renderer<br/>src/App.tsx]
    R --> P[Preload Bridge<br/>electron/preload.cts]
    P --> M[Electron Main Process<br/>main.cjs]

    M --> DB[SQLite Storage<br/>electron/db/index.ts]
    M --> GL[Local Git Analyzer<br/>electron/analytics/gitLocal.ts]
    M --> GH[GitHub Analyzer<br/>electron/analytics/github.ts]
    M --> TS[Secure Token Store<br/>electron/security/tokenStore.ts]
    M --> RP[Markdown Report Builder<br/>electron/report/mdReport.ts]

    GL --> GIT[Local Git Repository]
    GH --> API[GitHub API]
    RP --> FILE[Exported Markdown File]
```

### Flow Summary

- The React renderer handles the desktop UI.
- The preload bridge exposes a safe API from Electron to the renderer.
- The Electron main process coordinates IPC, storage, analysis, and export actions.
- Repository analytics come from local Git history and GitHub API data.
- App state, recent repositories, and saved projects are stored in SQLite.

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm

### Installation

```bash
git clone https://github.com/kspeiris/Developer-Behavior-Analytics-Tool.git
cd Developer-Behavior-Analytics-Tool
npm install
```

### Run in Development

```bash
npm run dev
```

This starts Vite, watches the Electron files, and launches the Electron app.

### Build the App

```bash
npm run build
```

### Run the Built App

```bash
npm run start
```

### Package the App

```bash
npm run pack
```

To create an installer:

```bash
npm run dist
```

## Usage

### Local Repository Analysis

1. Open the app.
2. Choose `Local`.
3. Browse to a folder that contains a `.git` directory.
4. Optionally set `Since` and `Until`.
5. Click `Analyze`.

### GitHub Analysis

1. Choose `GitHub`.
2. Enter your GitHub OAuth app client ID.
3. Enter the GitHub username to analyze.
4. Complete login.
5. Click `Analyze`.

### Reports

1. Run an analysis.
2. Open the `Reports` view.
3. Export the current results as Markdown.

## Roadmap

- [x] Local Git repository analysis
- [x] GitHub account integration
- [x] Dashboard and charts
- [ ] Multi-repository comparison
- [ ] Team or organization analytics
- [ ] PDF export
- [ ] Preset date ranges

## Contributing

1. Fork the repository.
2. Create a branch.
3. Make your changes.
4. Commit and push.
5. Open a pull request.

## License

This project is licensed under the MIT License.

## Contact

Kavindu Peiris  
GitHub: https://github.com/kspeiris

Project: https://github.com/kspeiris/Developer-Behavior-Analytics-Tool
