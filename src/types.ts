export interface ScanOptions {
  verbose?: boolean;
  output?: string;
}

export interface VulnerabilityReport {
  vulnerabilities: Vulnerability[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
  insights: string[];
}

export interface Vulnerability {
  severity: 'high' | 'medium' | 'low';
  file: string;
  line: number;
  description: string;
  recommendation: string;
}
