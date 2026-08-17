export interface WebRuntimeConfig {
  apiUrl: string;
  realtimeUrl: string;
}

export const getWebRuntimeConfig = (env: Record<string, string | undefined>): WebRuntimeConfig => ({
  apiUrl: env.VITE_API_URL ?? 'http://localhost:3000',
  realtimeUrl: env.VITE_REALTIME_URL ?? 'ws://localhost:2567',
});
