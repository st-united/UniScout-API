import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DashboardService } from './dashboard.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class DashboardGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly _dashboardService: DashboardService) {}

  afterInit(server: Server) {
    console.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('request_dashboard_update')
  async handleDashboardRequest(@ConnectedSocket() client: Socket) {
    const data = await this._dashboardService.getSummary();
    client.emit('dashboard_update', data);
  }

  async emitDashboardUpdate() {
    const data = await this._dashboardService.getSummary();
    this.server.emit('dashboard_update', data);
  }
}
