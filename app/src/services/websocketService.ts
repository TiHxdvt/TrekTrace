/**
 * WebSocket + STOMP 连接管理服务
 * 负责连接、订阅、断线重连
 * 连接在 AppNavigator 中发起，与认证生命周期绑定
 */

import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getToken } from './api';
import { APP_CONFIG } from '../config';

const RECONNECT_DELAY = 5000;

type MessageHandler = (message: Record<string, unknown>) => void;

interface SubscriptionEntry {
  handler: MessageHandler;
  stompSub: StompSubscription | null;
}

class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, SubscriptionEntry> = new Map();
  private connected = false;
  private connecting = false;

  async connect(): Promise<void> {
    if (this.connected || this.connecting) return;
    this.connecting = true;

    try {
      const token = await getToken();
      if (!token) {
        console.warn('[WS] No token, skipping connection');
        this.connecting = false;
        return;
      }

      console.log('[WS] Connecting to', APP_CONFIG.WS_BASE_URL);
      this.client = new Client({
        webSocketFactory: () => new SockJS(APP_CONFIG.WS_BASE_URL),
        reconnectDelay: RECONNECT_DELAY,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        onConnect: () => {
          console.log('[WS] Connected');
          this.connected = true;
          this.connecting = false;
          // Re-subscribe all active subscriptions
          this.subscriptions.forEach((_, destination) => {
            this.doSubscribe(destination);
          });
        },
        onDisconnect: () => {
          console.log('[WS] Disconnected');
          this.connected = false;
          this.connecting = false;
        },
        onStompError: (frame) => {
          console.error('[WS] STOMP error:', frame.headers['message']);
          this.connected = false;
          this.connecting = false;
        },
        onWebSocketClose: (evt) => {
          console.log('[WS] Socket closed:', evt?.code, evt?.reason);
        },
      });

      this.client.activate();
    } catch (e) {
      this.connecting = false;
      console.error('[WS] Connect failed:', e);
    }
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.connected = false;
    }
  }

  subscribe(destination: string, handler: MessageHandler): void {
    console.log('[WS] Subscribe:', destination, '| connected:', this.connected);
    this.subscriptions.set(destination, { handler, stompSub: null });
    if (this.connected && this.client?.active) {
      this.doSubscribe(destination);
    }
  }

  unsubscribe(destination: string): void {
    console.log('[WS] Unsubscribe:', destination);
    const entry = this.subscriptions.get(destination);
    if (entry?.stompSub) {
      try {
        entry.stompSub.unsubscribe();
      } catch {
        // subscription may already be closed
      }
    }
    this.subscriptions.delete(destination);
  }

  private doSubscribe(destination: string): void {
    if (!this.client?.active || !this.connected) return;
    const entry = this.subscriptions.get(destination);
    if (!entry) return;
    try {
      const stompSub = this.client.subscribe(destination, (message: IMessage) => {
        try {
          const body = JSON.parse(message.body);
          entry.handler(body);
        } catch {
          entry.handler(message.body);
        }
      });
      entry.stompSub = stompSub;
    } catch (e) {
      // STOMP client may throw if connection is not fully established yet
      // Will be retried on next connect
      console.warn('[WS] Subscribe failed (will retry on reconnect):', destination, e);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const websocketService = new WebSocketService();
