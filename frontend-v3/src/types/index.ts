export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: Record<string, any>;
}

export interface Alert {
  id: string;
  timestamp: number;
  type: 'malicious' | 'suspicious' | 'safe';
  content: string;
  author_address: string;
  confidence: number;
  classification: string;
}

export interface AnalysisResult {
  id: string;
  classification: 'safe' | 'suspicious' | 'malicious';
  confidence: number;
  details: {
    risk_factors?: string[];
    safe_indicators?: string[];
    threat_level?: number;
  };
  timestamp: number;
}

export interface AppStats {
  totalAnalyzed: number;
  safeCount: number;
  maliciousCount: number;
  suspiciousCount: number;
  alertCount: number;
  lastUpdated: number;
}

export interface ContentSubmission {
  content: string;
  author_address?: string;
}