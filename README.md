# 🛡️ WarpGuard
## The AI Guardian for Avalanche Warp Messaging

> **Avalanche Team1 Hackathon Hyderabad 2025 Submission**  
> *AI-driven cross-chain content moderation protecting the Avalanche ecosystem*

[![Demo Video](https://img.shields.io/badge/📹_Demo_Video-Watch_Now-red?style=for-the-badge)](https://drive.google.com/drive/folders/1r20dzjLq8QGxVqkB_QWWbj_AMlyA-CfA?usp=sharing)
[![Pitch Deck](https://img.shields.io/badge/📊_Pitch_Deck-View_PPT-blue?style=for-the-badge)](https://docs.google.com/presentation/d/1HgeBgC7kuPL2yxoNHkcuuUUSyHDY1TqBmdCh9AxrrEI/edit?usp=sharing)

---

## 🏆 Hackathon Submission Details

| **Event** | Avalanche Team1 Hackathon Hyderabad 2025 |
|-----------|-------------------------------------------|
| **Team** | **Team Igris** 👑 |
| **Members** | **Shivamani Yamana** - Web3 Developer<br/>**Srinivas Mandula** - Frontend & AI Integration |
| **Category** | Interchain/AI Integrations |

---

## 🎯 Problem Statement

Current blockchain security solutions are **isolated and reactive**. When malicious content or bad actors are detected on one network, they simply migrate to another subnet, continuing their harmful activities. This creates a whack-a-mole scenario where threats persist across the ecosystem.

## 💡 Our Solution

**WarpGuard** is the world's first **AI Guardian for Avalanche Warp Messaging**, revolutionizing cross-chain content security. It provides:

- **🤖 Intelligent AI Analysis** - Real-time malicious content detection using advanced language models
- **🌐 Warp Messaging Integration** - Seamless cross-chain communication via Avalanche's Inter-Chain Messaging
- **⚡ Instant Protection** - Sub-second threat detection and propagation across subnets
- **🛡️ Universal Security** - One detection shields the entire Avalanche ecosystem

---


### 🔧 **Technical Documentation**

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Python        │    │   Blockchain    │
│   (React)       │────│   Oracle        │────│   Contracts     │
│                 │    │   (FastAPI)     │    │   (Solidity)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web3          │    │   Groq AI       │    │   App Subnet    │
│   Wallet        │    │   Classification│    │   Content.sol   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                                                       │ Cross-Chain
                                                       ▼
                                              ┌─────────────────┐
                                              │  Security Subnet │
                                              │  Guardian.sol   │
                                              └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- Python 3.8+
- MetaMask browser extension
- Groq API key ([Get one here](https://console.groq.com/))

### 1. Clone and Setup

```bash
git clone <repository-url>
cd ai-content-guardian
```

### 2. Configure Groq API

Edit `oracle-v3/.env` and add your Groq API key:

```bash
GROQ_API_KEY=your_actual_groq_api_key_here
```

### 3. Start All Services

```bash
./start-all.sh
```

This will start:
- 🐍 Python Oracle at `http://localhost:5000`
- 🌐 Frontend at `http://localhost:3000`

### 4. Set Up Local Avalanche Network (Optional)

For full cross-chain demo, set up local Avalanche subnets:

```bash
# Install Avalanche CLI
curl -sSfL https://raw.githubusercontent.com/ava-labs/avalanche-cli/main/scripts/install.sh | sh -s

# Create subnets
avalanche subnet create app-subnet
avalanche subnet create security-subnet

# Start local network
avalanche network start

# Deploy subnets
avalanche subnet deploy app-subnet --local
avalanche subnet deploy security-subnet --local
```

### 5. Deploy Contracts

```bash
cd blockchain-v3

# Deploy to App Subnet
npx hardhat run scripts/deploy-content.js --network localhost

# Deploy to Security Subnet  
npx hardhat run scripts/deploy-guardian.js --network localhost
```

### 6. Update Frontend Config

Update contract addresses in `frontend-v3/app.js`:

```javascript
CONTRACTS: {
    CONTENT_ADDRESS: '0x...', // From deployment output
    GUARDIAN_ADDRESS: '0x...' // From deployment output
}
```

## 🎯 How It Works

### 1. Content Submission
- User submits content through the frontend
- Content is sent to the App Subnet's Content contract
- Contract emits a `ContentSubmitted` event

### 2. AI Analysis
- Python Oracle listens for blockchain events
- Oracle sends content to Groq AI for classification
- AI returns either "SAFE" or "MALICIOUS"

### 3. Cross-Chain Action
- If content is malicious, Oracle triggers cross-chain action
- Guardian contract on Security Subnet flags the address
- Alert is displayed in the frontend

## 🛠️ Development Guide

### Project Structure

```
ai-content-guardian/
├── blockchain-v3/          # Smart contracts & deployment
│   ├── contracts/
│   │   ├── Content.sol     # App Subnet contract
│   │   └── Guardian.sol    # Security Subnet contract
│   ├── scripts/
│   └── hardhat.config.ts
├── oracle-v3/              # Python AI Oracle
│   ├── oracle_service.py   # FastAPI server
│   ├── requirements.txt
│   └── .env
├── frontend-v3/            # Web interface
│   ├── index.html
│   ├── app.js
│   └── package.json
└── start-all.sh           # Startup script
```

## 🧪 Testing

### Test AI Classification

```bash
curl -X POST http://localhost:5000/analyze-content \
  -H "Content-Type: application/json" \
  -d '{"content": "Click here to claim your prize now!", "author_address": "0x123..."}'
```

### Test Frontend

1. Open `http://localhost:3000`
2. Connect MetaMask
3. Submit test content:
   - Safe: "Hello world!"
   - Malicious: "Click here to claim your prize!"

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

## 🌟 The Future of Blockchain Security

> **"Trust is the foundation. We're building it!"**  
> *– Team Igris*

**WarpGuard** represents a paradigm shift in blockchain security—from reactive, isolated protection to proactive, ecosystem-wide immunity. By combining the power of artificial intelligence with Avalanche's revolutionary Warp Messaging technology, we're not just building a product; we're architecting the trust infrastructure for the decentralized future.

### 🚀 What's Next?

- **Q4 2025:** Advanced threat intelligence and machine learning models
- **2026:** Multi-ecosystem expansion beyond Avalanche
- **Long-term:** Universal blockchain security protocol

**Join us in building the immune system for Web3.**

---

<div align="center">

### 👑 **Team Igris** | **Avalanche Team1 Hackathon Hyderabad 2025**

[![Shivamani Yamana](https://img.shields.io/badge/⛓_Shivamani_Yamana-Web3_Developer-blue)](https://github.com/shivamani-yamana)
[![Srinivas Mandula](https://img.shields.io/badge/👨‍💻_Srinivas_Mandula-Frontend_and_AI_Integrations-green)](https://github.com/srinivas-mandula)

**Built with ❤️ for the Avalanche Community**

</div>
