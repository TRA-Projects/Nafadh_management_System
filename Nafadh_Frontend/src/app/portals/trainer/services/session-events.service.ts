import { Injectable } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SessionEventsService {
  private connection?: HubConnection;

  async connect(sessionId: number): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      return;
    }

    // عدّلي اسم الخاصية إذا كان ملف environment يستخدم اسمًا آخر.
    const hubUrl = `${environment.apiUrl}/hubs/session-events`;

    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    this.connection.onreconnected(async () => {
      await this.connection?.invoke('JoinSession', sessionId);
    });

    await this.connection.start();
    await this.connection.invoke('JoinSession', sessionId);
  }

  listen<T>(eventName: string, callback: (data: T) => void): void {
    this.connection?.on(eventName, callback);
  }

  async leave(sessionId: number): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      await this.connection.invoke('LeaveSession', sessionId);
    }
  }

  async disconnect(): Promise<void> {
    await this.connection?.stop();
    this.connection = undefined;
  }
}
