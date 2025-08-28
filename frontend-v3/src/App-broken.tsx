import React, { useState, useEffect } from 'react'
import Web3 from 'web3'
import './App.css'

interface Alert {
  id: string
  content: string
  classification: string
  timestamp: number
  txHash?: string
  subnet?: 'app' | 'security'
}

const ORACLE_URL = import.meta.env.VITE_ORACLE_URL || 'http://localhost:5000'
const PRIVATE_KEY = import.meta.env.VITE_PRIVATE_KEY

// Real Avalanche subnet configurations
const APP_SUBNET = {
  chainId: 1221,
  chainName: 'App Subnet',
  rpcUrl: 'http://127.0.0.1:41243/ext/bc/S9KE4zarW96qo19RUj3ZWfoFKhetZgarjNnmJ6McAogjtRHVs/rpc'
}

const SECURITY_SUBNET = {
  chainId: 1222,
  chainName: 'Security Subnet', 
  rpcUrl: 'http://127.0.0.1:39737/ext/bc/21FZHCQk1zyjTdw7rUfZJNs53QVvbB1t2k4rYwn23o66RcAcFo/rpc'
}

function App() {
  const [account, setAccount] = useState<string>('')
  const [web3App, setWeb3App] = useState<Web3 | null>(null)
  const [web3Security, setWeb3Security] = useState<Web3 | null>(null)
  const [content, setContent] = useState<string>('')
  const [alertsBySubnet, setAlertsBySubnet] = useState<{
    app: Alert[]
    security: Alert[]
  }>({ app: [], security: [] })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentSubnet, setCurrentSubnet] = useState<'app' | 'security'>('app')
  const [isConnected, setIsConnected] = useState(false)
  const [securityFlags, setSecurityFlags] = useState<{
    isMalicious: boolean
    violationCount: number
    subnetInfo?: string
  }>({ isMalicious: false, violationCount: 0 })
  const [crossChainActivity, setCrossChainActivity] = useState<{
    totalICMMessages: number
    flaggedAccounts: number
    lastActivity: number | null
  }>({ totalICMMessages: 0, flaggedAccounts: 0, lastActivity: null })

  // Computed values
  const currentAlerts = alertsBySubnet[currentSubnet]
  const totalSubmissions = Object.values(alertsBySubnet).flat().length
  const totalMalicious = Object.values(alertsBySubnet).flat().filter(a => a.classification === 'MALICIOUS').length

  useEffect(() => {
    initializeConnections()
  }, [])

  const initializeConnections = async () => {
    try {
      // Setup Web3 connections
      const appWeb3 = new Web3(APP_SUBNET.rpcUrl)
      const securityWeb3 = new Web3(SECURITY_SUBNET.rpcUrl)
      
      setWeb3App(appWeb3)
      setWeb3Security(securityWeb3)
      
      // Setup account from private key
      if (PRIVATE_KEY) {
        const account = appWeb3.eth.accounts.privateKeyToAccount(PRIVATE_KEY)
        appWeb3.eth.accounts.wallet.add(account)
        securityWeb3.eth.accounts.wallet.add(account)
        
        setAccount(account.address)
        setIsConnected(true)
      }
      
      console.log('Web3 connections established')
    } catch (error) {
      console.error('Failed to initialize connections:', error)
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

    // Only allow content submission on App Subnet
    if (currentSubnet !== 'app') {
      alert('Content can only be submitted on the App Subnet. Please switch to App Subnet to submit content.')
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
      
      // Add to App subnet alerts
      const newAlert: Alert = {
        id: Date.now().toString(),
        content: content.trim(),
        classification: result.classification,
        timestamp: Date.now(),
        txHash: result.transaction_hash,
        subnet: 'app'
      }
      
      setAlertsBySubnet(prev => ({
        ...prev,
        app: [newAlert, ...prev.app]
      }))
      
      // Update cross-chain activity
      setCrossChainActivity(prev => ({
        ...prev,
        totalICMMessages: prev.totalICMMessages + 1,
        flaggedAccounts: result.classification === 'MALICIOUS' ? prev.flaggedAccounts + 1 : prev.flaggedAccounts,
        lastActivity: Date.now()
      }))

      // If malicious, simulate cross-chain alert to Security Subnet
      if (result.classification === 'MALICIOUS') {
        setTimeout(() => {
          const securityAlert: Alert = {
            id: `security-${Date.now()}`,
            content: `🚨 ICM Alert: Malicious address ${account.slice(0, 6)}...${account.slice(-4)} flagged via cross-chain messaging from App Subnet`,
            classification: 'SYSTEM',
            timestamp: Date.now(),
            subnet: 'security'
          }
          
          setAlertsBySubnet(prev => ({
            ...prev,
            security: [securityAlert, ...prev.security]
          }))
        }, 2000)
      }
      
      setContent('')
      setTimeout(() => updateSecurityStatus(), 1000)
      
    } catch (error) {
      console.error('Error analyzing content:', error)
      alert('Failed to analyze content. Please check if the Oracle service is running.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const switchSubnet = async (subnet: 'app' | 'security') => {
    console.log(`Switching to ${subnet} subnet...`)
    setCurrentSubnet(subnet)
    
    // Add system message to show subnet switch
    const switchAlert: Alert = {
      id: `switch-${Date.now()}`,
      content: `Switched to ${subnet === 'app' ? 'App Subnet (Chain 1221) - Content Submission & Analysis' : 'Security Subnet (Chain 1222) - Guardian Monitoring & Security Alerts'}`,
      classification: 'SYSTEM',
      timestamp: Date.now(),
      subnet: subnet
    }
    
    setAlertsBySubnet(prev => ({
      ...prev,
      [subnet]: [switchAlert, ...prev[subnet]]
    }))
    
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

      const contractAddress = '0x8B3BC4270BE2abbB25BC04717830bd1Cc493a461'
      
      if (currentSubnet === 'app') {
        // On App Subnet, show submission count
        return { 
          isMalicious: false, 
          violationCount: alertsBySubnet.app.length,
          subnetInfo: `App Subnet - ${alertsBySubnet.app.length} submissions`
        }
      } else {
        // On Security Subnet, show flagged status
        const flaggedCount = alertsBySubnet.security.filter(a => a.classification === 'MALICIOUS').length
        return { 
          isMalicious: flaggedCount > 0, 
          violationCount: flaggedCount,
          subnetInfo: `Security Subnet - ${flaggedCount > 0 ? 'FLAGGED' : 'CLEAN'}`
        }
      }
    } catch (error) {
      console.error(`Error checking ${currentSubnet} subnet:`, error)
      return { 
        isMalicious: false, 
        violationCount: 0,
        subnetInfo: `${currentSubnet} subnet - Error`
      }
    }
  }

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
          <div className="hero-title-container" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '20px',
            marginBottom: '12px'
          }}>
            <img 
              src="/logo-v2.png" 
              alt="WarpGuard Logo" 
              style={{ 
                width: '60px', 
                height: '100%',
                fill: 'white',
              }}
            />
            <h1 className="hero-title" style={{ margin: 0 }}>WarpGuard</h1>
          </div>
          <h1 className="hero-title" style={{ fontWeight: 'normal', fontSize: '2.2rem' }}>The AI Guardian for Avalanche Warp Messaging</h1>
          <p className="hero-subtitle">
            AI-driven Inter-Chain Messaging for content moderation - App Subnet submits content, AI Oracle analyzes threats, Security Subnet receives cross-chain alerts via ICM
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
                  <small>Chain 1221 - Content Submission</small>
                </div>
              </button>
              <button
                className={`toggle-option ${currentSubnet === 'security' ? 'active' : ''}`}
                onClick={() => switchSubnet('security')}
              >
                <div className="toggle-icon">🔐</div>
                <div className="toggle-text">
                  <span>Security Subnet</span>
                  <small>Chain 1222 - Guardian Monitoring</small>
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
            <div className="stat-number">{totalMalicious}</div>
            <div className="stat-label">Total Malicious</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{crossChainActivity.totalICMMessages}</div>
            <div className="stat-label">ICM Messages</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{currentAlerts.length}</div>
            <div className="stat-label">{currentSubnet === 'app' ? 'App Activity' : 'Security Alerts'}</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="main-grid">
        {/* Content Analyzer */}
        <div className="analyzer-section">
          <div className="section-header">
            <h2>{currentSubnet === 'app' ? '📱 App Subnet - Content Submission' : '🔐 Security Subnet - Guardian Monitoring'}</h2>
            <p>
              {currentSubnet === 'app' 
                ? 'Submit content for AI analysis and cross-chain security verification'
                : 'Monitor cross-chain security alerts and flagged addresses from ICM messages'
              }
            </p>
          </div>
          
          <div className="analyzer-card">
            <div className="subnet-context">
              <span className="subnet-indicator">
                {currentSubnet === 'app' 
                  ? '📱 App Subnet (Chain 1221) - Submit content for AI analysis' 
                  : '🔐 Security Subnet (Chain 1222) - Guardian monitoring only'
                }
              </span>
            </div>
            
            {currentSubnet === 'app' ? (
              <div className="input-wrapper">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter content to submit to App Subnet for AI-powered cross-chain security analysis..."
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
                        Submit to App Subnet
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="security-view">
                <div className="security-info">
                  <h4>🔐 Security Subnet - Guardian Monitoring</h4>
                  <p>This subnet monitors threats detected by the AI Oracle via Inter-Chain Messaging (ICM). Content is NOT submitted here - this is purely for security monitoring and address flagging.</p>
                  <div className="security-features">
                    <div className="feature">
                      <span className="feature-icon">🚫</span>
                      <span>Malicious address flagging</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">📊</span>
                      <span>Violation count tracking</span>
                    </div>
                    <div className="feature">
                      <span className="feature-icon">🔗</span>
                      <span>Cross-chain security alerts via ICM</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                    {securityFlags.subnetInfo && (
                      <>
                        <br />
                        Status: <strong>{securityFlags.subnetInfo}</strong>
                      </>
                    )}
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
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              {currentSubnet === 'app' ? '📱 App Subnet Activity' : '🚨 Security Subnet Monitoring'}
            </h3>
            <div className="alerts-grid">
              {currentAlerts.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">
                    {currentSubnet === 'app' ? '📱' : '🛡️'}
                  </span>
                  <div className="empty-state-title">
                    {currentSubnet === 'app' ? 'No content submitted yet' : 'No security threats detected'}
                  </div>
                  <div className="empty-state-description">
                    {currentSubnet === 'app' 
                      ? 'Submit content above to test AI-powered cross-chain security'
                      : 'Switch to App Subnet to submit content for analysis'
                    }
                  </div>
                </div>
              ) : (
                currentAlerts.slice(0, 10).map((alert) => (
                  <div key={alert.id} className="alert-item">
                    <div className="alert-header">
                      <span className={`alert-badge ${
                        alert.classification === 'MALICIOUS' ? 'malicious' : 
                        alert.classification === 'SYSTEM' ? 'system' : 'safe'
                      }`}>
                        {alert.classification === 'MALICIOUS' ? '🚫 MALICIOUS' : 
                         alert.classification === 'SYSTEM' ? '🔄 SYSTEM' : '✅ SAFE'}
                      </span>
                      <span className="alert-time">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                      {alert.subnet && (
                        <span className="alert-subnet">
                          {alert.subnet === 'app' ? '📱 App' : '🔐 Security'}
                        </span>
                      )}
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

          {/* Cross-Chain Activity Visualization */}
          <div className="alert-card">
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>🔗 Cross-Chain Activity Monitor</h3>
            <div className="cross-chain-grid">
              <div className="activity-metric">
                <div className="metric-icon">📊</div>
                <div className="metric-content">
                  <div className="metric-number">{crossChainActivity.totalICMMessages}</div>
                  <div className="metric-label">ICM Messages</div>
                </div>
              </div>
              <div className="activity-metric">
                <div className="metric-icon">🚫</div>
                <div className="metric-content">
                  <div className="metric-number">{crossChainActivity.flaggedAccounts}</div>
                  <div className="metric-label">Flagged Accounts</div>
                </div>
              </div>
              <div className="activity-metric">
                <div className="metric-icon">⏱️</div>
                <div className="metric-content">
                  <div className="metric-number">
                    {crossChainActivity.lastActivity 
                      ? `${Math.floor((Date.now() - crossChainActivity.lastActivity) / 1000)}s` 
                      : 'N/A'}
                  </div>
                  <div className="metric-label">Last Activity</div>
                </div>
              </div>
            </div>
            
            {/* Subnet Comparison */}
            <div className="subnet-comparison">
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>📊 Subnet Activity Comparison</h4>
              <div className="comparison-grid">
                <div className="subnet-stats">
                  <div className="subnet-header">
                    <span className="subnet-icon">📱</span>
                    <span className="subnet-name">App Subnet</span>
                  </div>
                  <div className="subnet-metrics">
                    <div className="subnet-metric">
                      <span className="metric-value">{alertsBySubnet.app.length}</span>
                      <span className="metric-name">Total Activity</span>
                    </div>
                    <div className="subnet-metric">
                      <span className="metric-value">{alertsBySubnet.app.filter(a => a.classification === 'MALICIOUS').length}</span>
                      <span className="metric-name">Malicious</span>
                    </div>
                  </div>
                </div>
                <div className="subnet-stats">
                  <div className="subnet-header">
                    <span className="subnet-icon">🔐</span>
                    <span className="subnet-name">Security Subnet</span>
                  </div>
                  <div className="subnet-metrics">
                    <div className="subnet-metric">
                      <span className="metric-value">{alertsBySubnet.security.length}</span>
                      <span className="metric-name">Total Activity</span>
                    </div>
                    <div className="subnet-metric">
                      <span className="metric-value">{alertsBySubnet.security.filter(a => a.classification === 'MALICIOUS').length}</span>
                      <span className="metric-name">Threats Detected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
