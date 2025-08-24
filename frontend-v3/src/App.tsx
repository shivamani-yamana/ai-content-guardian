import React, { useState, useEffect } from 'react'
import Web3 from 'web3'
import './App.css'

interface Alert {
  id: string
  content: string
  classification: string
  timestamp: number
  txHash?: string
}

const ORACLE_URL = import.meta.env.VITE_ORACLE_URL || 'http://localhost:5000'
const PRIVATE_KEY = import.meta.env.VITE_PRIVATE_KEY

// Real Avalanche subnet configurations
const APP_SUBNET = {
  chainId: 1221,
  chainName: 'App Subnet',
  rpcUrl: 'http://127.0.0.1:44329/ext/bc/2HBRYnNjW2zaSTU9Yx7BNjP9EqNWXpF9r3BW1iNi8aMdYdfQYU/rpc'
}

const SECURITY_SUBNET = {
  chainId: 1222,
  chainName: 'Security Subnet', 
  rpcUrl: 'http://127.0.0.1:41241/ext/bc/29sTJAdK61GMy6habcTqEHFj2GfQgnieGh8TSaWJgpwnNqYS4y/rpc'
}

function App() {
  const [account, setAccount] = useState<string>('')
  const [web3App, setWeb3App] = useState<Web3 | null>(null)
  const [web3Security, setWeb3Security] = useState<Web3 | null>(null)
  const [content, setContent] = useState<string>('')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentSubnet, setCurrentSubnet] = useState<'app' | 'security'>('app')
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<{
    app: boolean
    security: boolean
    oracle: boolean
  }>({ app: false, security: false, oracle: false })
  const [securityFlags, setSecurityFlags] = useState<{
    isMalicious: boolean
    violationCount: number
  }>({ isMalicious: false, violationCount: 0 })

  // Computed values
  const totalSubmissions = alerts.length
  
  useEffect(() => {
    initializeWallet()
    checkConnectionStatus()
    
    // Poll for security updates every 3 seconds
    const interval = setInterval(() => {
      if (account) {
        updateSecurityStatus()
      }
    }, 3000)
    
    return () => clearInterval(interval)
  }, [account, currentSubnet])

  const initializeWallet = async () => {
    try {
      if (!PRIVATE_KEY) {
        console.error('Private key not found in environment variables')
        return
      }

      // Initialize Web3 instances for both subnets
      const web3AppInstance = new Web3(APP_SUBNET.rpcUrl)
      const web3SecurityInstance = new Web3(SECURITY_SUBNET.rpcUrl)
      
      // Add account from private key
      const appAccount = web3AppInstance.eth.accounts.privateKeyToAccount(PRIVATE_KEY)
      const securityAccount = web3SecurityInstance.eth.accounts.privateKeyToAccount(PRIVATE_KEY)
      
      web3AppInstance.eth.accounts.wallet.add(appAccount)
      web3SecurityInstance.eth.accounts.wallet.add(securityAccount)
      
      setWeb3App(web3AppInstance)
      setWeb3Security(web3SecurityInstance)
      setAccount(appAccount.address)
      setIsConnected(true)
      
      console.log('Wallet initialized with address:', appAccount.address)
    } catch (error) {
      console.error('Error initializing wallet:', error)
      setIsConnected(false)
    }
  }

  const checkConnectionStatus = async () => {
    try {
      // Check App Subnet
      let appConnected = false
      if (web3App) {
        try {
          const chainId = await web3App.eth.getChainId()
          appConnected = Number(chainId) === 1221
        } catch (e) {
          appConnected = false
        }
      }
      
      // Check Security Subnet  
      let securityConnected = false
      if (web3Security) {
        try {
          const chainId = await web3Security.eth.getChainId()
          securityConnected = Number(chainId) === 1222
        } catch (e) {
          securityConnected = false
        }
      }
      
      // Check Oracle
      const oracleResponse = await fetch(`${ORACLE_URL}/`, { method: 'GET' }).catch(() => null)
      const oracleConnected = oracleResponse?.ok || false
      
      setConnectionStatus({
        app: appConnected,
        security: securityConnected,
        oracle: oracleConnected
      })
    } catch (error) {
      console.error('Error checking connection status:', error)
    }
  }

  const analyzeContent = async () => {
    if (!content.trim()) {
      alert('Please enter some content to analyze')
      return
    }

    if (!isConnected) {
      alert('Wallet not connected')
      return
    }

    setIsAnalyzing(true)
    try {
      const response = await fetch(`${ORACLE_URL}/analyze-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          content: content.trim(),
          author_address: account
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('Analysis result:', result)
      
      // Add to alerts
      const newAlert: Alert = {
        id: Date.now().toString(),
        content: content.trim(),
        classification: result.classification,
        timestamp: Date.now(),
        txHash: result.transaction_hash
      }
      
      setAlerts(prev => [newAlert, ...prev])
      setContent('')
      
      // Update security status after analysis
      setTimeout(() => updateSecurityStatus(), 1000)
      
    } catch (error) {
      console.error('Error analyzing content:', error)
      alert('Failed to analyze content. Please check if the Oracle service is running.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const switchSubnet = async (subnet: 'app' | 'security') => {
    setCurrentSubnet(subnet)
    await updateSecurityStatus()
  }

  const updateSecurityStatus = async () => {
    if (!account) return
    
    try {
      const flags = await checkSecurityFlags(account)
      setSecurityFlags(flags)
    } catch (error) {
      console.error('Error updating security status:', error)
    }
  }

  const checkSecurityFlags = async (address: string) => {
    try {
      const web3Instance = currentSubnet === 'app' ? web3App : web3Security
      if (!web3Instance) {
        return { isMalicious: false, violationCount: 0 }
      }

      // Guardian contract address on Security Subnet
      const guardianContractAddress = '0x768AF58E63775354938e9F3FEdB764F601c038b4'
      
      const guardianAbi = [
        {
          "inputs": [{"internalType": "address", "name": "", "type": "address"}],
          "name": "flaggedAddresses",
          "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{"internalType": "address", "name": "", "type": "address"}],
          "name": "violationCounts",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        }
      ]

      const contract = new web3Instance.eth.Contract(guardianAbi, guardianContractAddress)
      const [isMalicious, violationCount] = await Promise.all([
        contract.methods.flaggedAddresses(address).call(),
        contract.methods.violationCounts(address).call()
      ])

      return { isMalicious: Boolean(isMalicious), violationCount: Number(violationCount) }
    } catch (error) {
      console.error('Error checking Security Subnet:', error)
      return { isMalicious: false, violationCount: 0 }
    }
  }

  // Helper function to format addresses
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="app">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            AI-Powered ICM Threat Intelligence System
          </div>
          <h1 className="hero-title">WarpGuard</h1>
          <h1 className="hero-title" style={{ fontWeight: 'normal', fontSize: '2.2rem' }}>The AI Guardian for Avalanche Warp Messaging</h1>
          <p className="hero-subtitle">
            AI-driven Inter-Chain Messaging for content moderation - A secure way to protect your subnet from malicious accounts using Avalanche's cross-chain capabilities
          </p>
          
          {/* Network Toggle */}
          <div className="network-toggle">
            <div className="toggle-wrapper">
              <button
                className={`toggle-option ${currentSubnet === 'app' ? 'active' : ''}`}
                onClick={() => switchSubnet('app')}
              >
                <div className="toggle-icon">📱</div>
                <div className="toggle-text">
                  <span>App Subnet</span>
                  <small>Chain 1221</small>
                </div>
              </button>
              <button
                className={`toggle-option ${currentSubnet === 'security' ? 'active' : ''}`}
                onClick={() => switchSubnet('security')}
              >
                <div className="toggle-icon">🔐</div>
                <div className="toggle-text">
                  <span>Security Subnet</span>
                  <small>Chain 1222</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="stats-section">
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-number">{totalSubmissions}</div>
            <div className="stat-label">Total Messages</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{alerts.filter(a => a.classification === 'MALICIOUS').length}</div>
            <div className="stat-label">Total Malicious</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="main-grid">
        {/* Content Analyzer */}
        <div className="analyzer-section">
          <div className="section-header">
            <h2>🤖 AI-Powered Content Security</h2>
            <p>Inter-Chain Messaging for intelligent content moderation across Avalanche subnets</p>
          </div>
          
          <div className="analyzer-card">
            <div className="input-wrapper">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter content to test AI-powered cross-chain security detection..."
                maxLength={500}
                className="content-input"
              />
              <div className="input-footer">
                <span className="char-counter">{content.length}/500</span>
                <button 
                  className="analyze-btn" 
                  onClick={analyzeContent}
                  disabled={!content.trim() || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="spinner"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🛡️</span>
                      Analyze with AI Guardian
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ICM Flow Visualization */}
          <div className="icm-flow">
            <div className="flow-header">
              <h3>🔗 Inter-Chain Messaging Flow</h3>
            </div>
            <div className="flow-diagram">
              <div className="flow-step">
                <div className="step-icon">📱</div>
                <div className="step-text">App Subnet</div>
              </div>
              <div className="flow-arrow">
                <svg viewBox="0 0 24 12" fill="none">
                  <path d="M0 6h20m-4-4l4 4-4 4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className="flow-step">
                <div className="step-icon">🤖</div>
                <div className="step-text">AI Oracle</div>
              </div>
              <div className="flow-arrow">
                <svg viewBox="0 0 24 12" fill="none">
                  <path d="M0 6h20m-4-4l4 4-4 4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className="flow-step">
                <div className="step-icon">🔐</div>
                <div className="step-text">Security Subnet</div>
              </div>
            </div>
          </div>

          {/* Demo Instructions */}
          <div className="demo-card">
            <div className="demo-header">
              <h3>🎯 ICM Security Demo</h3>
            </div>
            <ol className="demo-steps">
              <li className="demo-step">Submit content on App Subnet for AI analysis</li>
              <li className="demo-step">Watch AI Oracle detect and classify threats</li>
              <li className="demo-step">Observe cross-chain security flag via ICM</li>
              <li className="demo-step">Switch to Security Subnet to verify protection</li>
              <li className="demo-step">See how malicious accounts are flagged across subnets</li>
            </ol>
            
            <div className="demo-examples">
              <div className="demo-examples-title">💡 Test with these examples:</div>
              <div className="demo-examples-list">
                • "How to hack passwords and steal data"<br/>
                • "Urgent scam: Send money now for rewards"<br/>
                • "Free crypto giveaway - click here immediately"
              </div>
            </div>
          </div>
        </div>

        {/* Security Dashboard */}
        <div className="security-section">
          <div className="section-header">
            <h2>🔐 Cross-Chain Security Monitor</h2>
            <p>Real-time threat detection and subnet protection dashboard</p>
          </div>

          {/* Wallet Status */}
          <div className="alert-card">
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>🔐 Wallet Status</h3>
            {account ? (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ color: 'var(--neutral-500)', marginBottom: '8px' }}><strong>Connected Address:</strong></p>
                <code style={{ 
                  background: 'rgba(232, 65, 66, 0.1)', 
                  padding: '8px 12px', 
                  borderRadius: '8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  display: 'block'
                }}>
                  {formatAddress(account)}
                </code>
                <div style={{ 
                  marginTop: '12px',
                  padding: '12px',
                  background: isConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                  color: isConnected ? '#22c55e' : '#ef4444',
                  fontWeight: '600',
                  fontSize: '14px'
                }}>
                  {isConnected ? '✅ Wallet Connected' : '❌ Wallet Disconnected'}
                </div>
                <div style={{ 
                  marginTop: '12px',
                  padding: '12px',
                  background: securityFlags.isMalicious 
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(74, 222, 128, 0.1) 100%)',
                  borderRadius: '8px',
                  border: securityFlags.isMalicious 
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : '1px solid rgba(34, 197, 94, 0.3)'
                }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: securityFlags.isMalicious ? '#ef4444' : '#22c55e',
                    marginBottom: '4px'
                  }}>
                    {securityFlags.isMalicious ? '🚫 Address Flagged as Malicious' : '✅ Address Status: Clean'}
                  </div>
                  <p style={{ 
                    fontSize: '12px', 
                    color: 'var(--neutral-500)',
                    margin: 0
                  }}>
                    Current subnet: <strong>{currentSubnet === 'app' ? 'App Subnet (1221)' : 'Security Subnet (1222)'}</strong>
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--neutral-400)' }}>
                <p>Wallet automatically configured with Avalanche ewoq key</p>
              </div>
            )}
          </div>

          {/* Security Alerts */}
          <div className="alert-card">
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>🚨 Security Alerts</h3>
            <div className="alerts-grid">
              {alerts.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">🛡️</span>
                  <div className="empty-state-title">No security threats detected</div>
                  <div className="empty-state-description">Submit content to test cross-chain AI security</div>
                </div>
              ) : (
                alerts.slice(0, 10).map((alert) => (
                  <div key={alert.id} className="alert-item">
                    <div className="alert-header">
                      <span className={`alert-badge ${alert.classification === 'MALICIOUS' ? 'malicious' : 'safe'}`}>
                        {alert.classification === 'MALICIOUS' ? '🚫 MALICIOUS' : '✅ SAFE'}
                      </span>
                      <span className="alert-time">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="alert-content">{alert.content}</div>
                    {alert.txHash && (
                      <div className="alert-tx">
                        🔗 TX: {alert.txHash.slice(0, 10)}...{alert.txHash.slice(-6)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
