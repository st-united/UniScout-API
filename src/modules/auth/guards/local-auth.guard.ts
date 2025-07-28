import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    request.ipAddress = request.ip;
    request.userAgent = request.headers['user-agent'];

    const result = (await super.canActivate(context)) as boolean;
    return result;
  }
}
