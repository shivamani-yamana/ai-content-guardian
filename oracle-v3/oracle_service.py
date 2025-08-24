from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import logging
from groq import Groq
from web3 import Web3
import os
import json
import time
from typing import List, Dict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="AI Content Guardian Oracle", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)

# Initialize Groq client
try:
    api_key = os.getenv('GROQ_API_KEY')
    if api_key and api_key != 'your_groq_api_key_here' and api_key.startswith('gsk_'):
        # Use the official Groq pattern from docs
        groq_client = Groq(api_key=api_key)
        logging.info("Groq client initialized successfully with real API key")
    else:
        groq_client = None
        logging.warning("Groq API key not provided or invalid - AI analysis will be simulated")
except Exception as e:
    logging.error(f"Failed to initialize Groq client: {e}")
    groq_client = None

# Web3 connections
app_subnet_w3 = None
security_subnet_w3 = None

# Contract configurations
app_contract = None
guardian_contract = None

# In-memory storage for alerts (for demo purposes)
alerts = []

class ContentSubmission(BaseModel):
    content: str
    author_address: str

class Alert(BaseModel):
    timestamp: int
    content: str
    author_address: str
    classification: str
    tx_hash: str

@app.on_event("startup")
async def startup_event():
    """Initialize blockchain connections on startup"""
    global app_subnet_w3, security_subnet_w3, app_contract, guardian_contract
    
    try:
        # Connect to app subnet
        app_rpc = os.getenv('APP_SUBNET_RPC', 'http://127.0.0.1:8545')
        app_subnet_w3 = Web3(Web3.HTTPProvider(app_rpc))
        logging.info(f"App Subnet connected: {app_subnet_w3.is_connected()}")
        
        # Connect to security subnet
        security_rpc = os.getenv('SECURITY_SUBNET_RPC', 'http://127.0.0.1:8546')
        security_subnet_w3 = Web3(Web3.HTTPProvider(security_rpc))
        logging.info(f"Security Subnet connected: {security_subnet_w3.is_connected()}")
        
        # Load contract configurations
        setup_contracts()
        
        # Start event listener in background
        asyncio.create_task(listen_for_events())
        
    except Exception as e:
        logging.error(f"Startup error: {e}")

def setup_contracts():
    """Setup contract instances"""
    global app_contract, guardian_contract
    
    try:
        # Content contract ABI (simplified)
        content_abi = [
            {
                "anonymous": False,
                "inputs": [
                    {"indexed": True, "name": "author", "type": "address"},
                    {"indexed": False, "name": "content", "type": "string"},
                    {"indexed": False, "name": "timestamp", "type": "uint256"}
                ],
                "name": "ContentSubmitted",
                "type": "event"
            }
        ]
        
        # Guardian contract ABI (simplified)
        guardian_abi = [
            {
                "inputs": [{"name": "_maliciousAddress", "type": "address"}],
                "name": "flagAddress",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]
        
        content_address = os.getenv('CONTENT_CONTRACT_ADDRESS')
        guardian_address = os.getenv('GUARDIAN_CONTRACT_ADDRESS')
        
        if content_address and app_subnet_w3:
            app_contract = app_subnet_w3.eth.contract(
                address=Web3.to_checksum_address(content_address),
                abi=content_abi
            )
            logging.info(f"Content contract loaded at {content_address}")
            
        if guardian_address and security_subnet_w3:
            guardian_contract = security_subnet_w3.eth.contract(
                address=Web3.to_checksum_address(guardian_address),
                abi=guardian_abi
            )
            logging.info(f"Guardian contract loaded at {guardian_address}")
            
    except Exception as e:
        logging.error(f"Contract setup error: {e}")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "groq_connected": groq_client is not None,
        "app_subnet_connected": app_subnet_w3.is_connected() if app_subnet_w3 else False,
        "security_subnet_connected": security_subnet_w3.is_connected() if security_subnet_w3 else False
    }

@app.post("/analyze-content")
async def analyze_content(submission: ContentSubmission):
    """Analyze content using AI (Groq or simulation)"""
    try:
        # Classify content using Groq or simulation
        classification = await classify_with_groq(submission.content)
        
        # Add reasoning for better UX
        reasoning = ""
        if classification == "MALICIOUS":
            if groq_client:
                reasoning = "Groq AI detected potentially harmful content"
            else:
                reasoning = "Simulated AI detected suspicious keywords"
        else:
            if groq_client:
                reasoning = "Groq AI classified content as safe"
            else:
                reasoning = "Content appears safe"
        
        response = {
            "content": submission.content,
            "author_address": submission.author_address,
            "classification": classification,
            "reasoning": reasoning,
            "timestamp": int(time.time())
        }
        
        # If malicious, trigger cross-chain action
        if classification == "MALICIOUS":
            try:
                tx_hash = await flag_malicious_address(submission.author_address)
                response["tx_hash"] = tx_hash
                response["cross_chain_action"] = "Address flagged on Security Subnet"
            except Exception as e:
                logging.error(f"Cross-chain action failed: {e}")
                response["cross_chain_action"] = f"Failed: {str(e)}"
            
            # Add to alerts
            alerts.append(Alert(
                timestamp=response["timestamp"],
                content=submission.content,
                author_address=submission.author_address,
                classification=classification,
                tx_hash=response.get("tx_hash", "")
            ))
        
        logging.info(f"Analysis complete: {classification} for content: {submission.content[:50]}...")
        return response
        
    except Exception as e:
        logging.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
        
    except Exception as e:
        logging.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def classify_with_groq(content: str) -> str:
    """Classify content using Groq API or simulation"""
    try:
        if groq_client is None:
            # Simulate AI classification for testing
            logging.info("Simulating AI classification (no Groq API key)")
            suspicious_keywords = [
                "click here", "free prize", "urgent", "claim now", "limited time",
                "winner", "congratulations", "act fast", "exclusive offer", "scam",
                "phishing", "steal", "hack", "virus", "malware"
            ]
            
            content_lower = content.lower()
            for keyword in suspicious_keywords:
                if keyword in content_lower:
                    logging.info(f"Content classified as: MALICIOUS (keyword: {keyword})")
                    return "MALICIOUS"
            
            logging.info("Content classified as: SAFE")
            return "SAFE"
        
        prompt = f"""
        Analyze the following content and classify it as either 'SAFE' or 'MALICIOUS'.
        
        Content to analyze: "{content}"
        
        Classification criteria:
        - MALICIOUS: Contains hate speech, threats, scams, phishing attempts, or harmful content
        - SAFE: Normal, non-harmful content
        
        Respond with only one word: SAFE or MALICIOUS
        """
        
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Using the model from official docs
            messages=[{"role": "user", "content": prompt}],
            max_tokens=10,
            temperature=0.1
        )
        
        classification = response.choices[0].message.content.strip().upper()
        
        # Ensure response is valid
        if classification not in ["SAFE", "MALICIOUS"]:
            logging.warning(f"Unexpected classification: {classification}, defaulting to SAFE")
            classification = "SAFE"
            
        logging.info(f"Content classified as: {classification}")
        return classification
        
    except Exception as e:
        logging.error(f"Groq classification error: {e}")
        return "SAFE"  # Default to safe if classification fails

async def flag_malicious_address(address: str) -> str:
    """Flag malicious address on security subnet"""
    try:
        if not guardian_contract or not security_subnet_w3:
            logging.warning("Guardian contract not available, simulating cross-chain action")
            return "0x" + "0" * 64  # Mock transaction hash
            
        private_key = os.getenv('PRIVATE_KEY')
        if not private_key:
            raise Exception("Private key not configured")
            
        account = security_subnet_w3.eth.account.from_key(private_key)
        
        # Build transaction
        transaction = guardian_contract.functions.flagAddress(
            Web3.to_checksum_address(address)
        ).build_transaction({
            'from': account.address,
            'gas': 100000,
            'gasPrice': security_subnet_w3.to_wei('25', 'gwei'),  # Increased gas price
            'nonce': security_subnet_w3.eth.get_transaction_count(account.address)
        })
        
        # Sign and send transaction
        signed_txn = security_subnet_w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = security_subnet_w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        logging.info(f"Malicious address flagged. TX Hash: {tx_hash.hex()}")
        return tx_hash.hex()
        
    except Exception as e:
        logging.error(f"Failed to flag address: {e}")
        return "0x" + "0" * 64  # Mock transaction hash

@app.get("/alerts")
async def get_alerts():
    """Get all alerts for frontend polling"""
    return {"alerts": [alert.dict() for alert in alerts]}

@app.get("/alerts/latest")
async def get_latest_alert():
    """Get the latest alert"""
    if alerts:
        return alerts[-1].dict()
    return None

async def listen_for_events():
    """Background task to listen for ContentSubmitted events"""
    logging.info("Starting event listener...")
    
    while True:
        try:
            if app_contract:
                # Get latest events (in a real implementation, use filters and from_block)
                # For demo, we'll simulate this with the analyze endpoint
                pass
            
            await asyncio.sleep(5)  # Poll every 5 seconds
            
        except Exception as e:
            logging.error(f"Event listener error: {e}")
            await asyncio.sleep(10)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
