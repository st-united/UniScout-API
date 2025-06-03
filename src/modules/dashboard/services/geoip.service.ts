import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GeoIpService {
  private readonly logger = new Logger(GeoIpService.name);

  async getCountryFromIp(ip: string): Promise<string> {
    try {
      const response = await axios.get(`https://ipapi.co/${ip}/json/`);
      return response.data.country || 'Unknown';
    } catch (error) {
      this.logger.warn(`GeoIP lookup failed for IP ${ip}: ${error.message}`);
      return 'Unknown';
    }
  }
}
