import { getApiEndpoint } from '../config/environment';

export interface StreamingQuality {
  quality: string;
  resolution: string;
  bitrate: number;
  available: boolean;
  manifestURL?: string;
}

export interface AvailableQualitiesResponse {
  video_id: number;
  format: string;
  qualities: StreamingQuality[];
  defaultQuality: string;
}

export interface ProcessingJobResponse {
  job_id: number;
  status: string;
  message: string;
  estimated_time_minutes: number;
}

export interface StreamingStatusResponse {
  video_id: number;
  status: string;
  streaming_info?: AvailableQualitiesResponse;
  message: string;
}

export interface PlaybackEventData {
  video_id: number;
  user_id?: number;
  session_id: string;
  event_type: 'play' | 'pause' | 'seek' | 'quality_change' | 'buffer' | 'error';
  quality?: string;
  position?: number;
  buffer_health?: number;
  bandwidth?: number;
  platform?: string;
  network_type?: string;
  event_data?: string;
}

export interface BandwidthMeasurement {
  bandwidth: number; // kbps
  timestamp: number;
  quality: string;
}

class StreamingService {
  private baseURL: string;
  private streamingURL: string;
  private sessionId: string;
  private bandwidthHistory: BandwidthMeasurement[] = [];

  constructor() {
    this.baseURL = getApiEndpoint('video');
    this.streamingURL = getApiEndpoint('streaming') || 'http://localhost:8084';
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Process video for streaming
  async processVideoForStreaming(
    videoId: number,
    options: {
      format?: 'hls' | 'dash';
      qualities?: string[];
      priority?: number;
    } = {}
  ): Promise<ProcessingJobResponse> {
    const response = await fetch(`${this.baseURL}/api/v1/videos/${videoId}/process-streaming`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        format: options.format || 'hls',
        qualities: options.qualities || ['480p', '720p', '1080p'],
        priority: options.priority || 5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start video processing: ${response.statusText}`);
    }

    return response.json();
  }

  // Get streaming status for a video
  async getStreamingStatus(videoId: number): Promise<StreamingStatusResponse> {
    const response = await fetch(`${this.baseURL}/api/v1/videos/${videoId}/streaming-status`);

    if (!response.ok) {
      throw new Error(`Failed to get streaming status: ${response.statusText}`);
    }

    return response.json();
  }

  // Get available qualities for a video
  async getAvailableQualities(videoId: number): Promise<AvailableQualitiesResponse> {
    const response = await fetch(`${this.streamingURL}/api/v1/streaming/qualities/${videoId}`);

    if (!response.ok) {
      throw new Error(`Failed to get available qualities: ${response.statusText}`);
    }

    return response.json();
  }

  // Get streaming manifest URL
  getManifestURL(videoId: number, format: 'hls' | 'dash' = 'hls'): string {
    return `${this.baseURL}/api/v1/videos/${videoId}/manifest/${format}`;
  }

  // Get direct streaming manifest from streaming service
  getDirectManifestURL(videoId: number, format: 'hls' | 'dash' = 'hls'): string {
    return `${this.streamingURL}/api/v1/streaming/manifest/${videoId}/${format}`;
  }

  // Record playback event for analytics
  async recordPlaybackEvent(eventData: PlaybackEventData): Promise<void> {
    try {
      const response = await fetch(`${this.streamingURL}/api/v1/analytics/playback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...eventData,
          session_id: this.sessionId,
          platform: 'mobile',
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.warn('Failed to record playback event:', response.statusText);
      }
    } catch (error) {
      console.warn('Failed to record playback event:', error);
    }
  }

  // Measure bandwidth and record it
  measureBandwidth(downloadSize: number, downloadTime: number, quality: string): number {
    // Calculate bandwidth in kbps
    const bandwidth = Math.round((downloadSize * 8) / (downloadTime / 1000) / 1000);
    
    const measurement: BandwidthMeasurement = {
      bandwidth,
      timestamp: Date.now(),
      quality,
    };

    this.bandwidthHistory.push(measurement);

    // Keep only last 10 measurements
    if (this.bandwidthHistory.length > 10) {
      this.bandwidthHistory.shift();
    }

    return bandwidth;
  }

  // Get average bandwidth from recent measurements
  getAverageBandwidth(): number {
    if (this.bandwidthHistory.length === 0) return 0;

    const sum = this.bandwidthHistory.reduce((acc, measurement) => acc + measurement.bandwidth, 0);
    return Math.round(sum / this.bandwidthHistory.length);
  }

  // Recommend quality based on bandwidth
  recommendQuality(availableQualities: StreamingQuality[]): string {
    const avgBandwidth = this.getAverageBandwidth();
    
    // If no bandwidth data, start with medium quality
    if (avgBandwidth === 0) {
      return availableQualities.find(q => q.quality === '720p')?.quality || 
             availableQualities[Math.floor(availableQualities.length / 2)]?.quality || 
             availableQualities[0]?.quality;
    }

    // Sort qualities by bitrate (ascending)
    const sortedQualities = [...availableQualities].sort((a, b) => a.bitrate - b.bitrate);

    // Find the highest quality that fits within bandwidth (with 20% buffer)
    const targetBandwidth = avgBandwidth * 0.8;
    
    for (let i = sortedQualities.length - 1; i >= 0; i--) {
      if (sortedQualities[i].bitrate <= targetBandwidth) {
        return sortedQualities[i].quality;
      }
    }

    // If no quality fits, return the lowest
    return sortedQualities[0]?.quality;
  }

  // Check if video supports adaptive streaming
  async supportsAdaptiveStreaming(videoId: number): Promise<boolean> {
    try {
      const status = await this.getStreamingStatus(videoId);
      return status.status === 'completed' && !!status.streaming_info;
    } catch (error) {
      return false;
    }
  }

  // Get current session ID
  getSessionId(): string {
    return this.sessionId;
  }

  // Reset session (useful for new video playback)
  resetSession(): void {
    this.sessionId = this.generateSessionId();
    this.bandwidthHistory = [];
  }

  // Network type detection (simplified)
  getNetworkType(): string {
    // In a real app, you'd use NetInfo or similar
    // For now, return a default value
    return 'wifi';
  }

  // Get streaming statistics for a video
  async getStreamingStats(videoId: number, period: '24h' | '7d' | '30d' = '7d') {
    try {
      const response = await fetch(
        `${this.streamingURL}/api/v1/analytics/stats/${videoId}?period=${period}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get streaming stats: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.warn('Failed to get streaming stats:', error);
      return null;
    }
  }

  // Get bandwidth statistics
  async getBandwidthStats(period: '24h' | '7d' | '30d' = '7d') {
    try {
      const response = await fetch(
        `${this.streamingURL}/api/v1/analytics/bandwidth?period=${period}`
      );

      if (!response.ok) {
        throw new Error(`Failed to get bandwidth stats: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.warn('Failed to get bandwidth stats:', error);
      return null;
    }
  }
}

export const streamingService = new StreamingService();
