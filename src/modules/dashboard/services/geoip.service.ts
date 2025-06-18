import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeoIpService {
  private readonly _logger = new Logger(GeoIpService.name);
  private readonly _ipinfoApiKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this._ipinfoApiKey = this.configService.get<string>('IPINFO_API_KEY');
    if (!this._ipinfoApiKey) {
      this._logger.warn(
        'IPINFO_API_KEY is not set. Using IPinfo Lite unauthenticated endpoint. Consider getting a free API key for better reliability and dashboard access.'
      );
    }
  }

  async getCountryFromIp(ip: string): Promise<string> {
    this._logger.log(`GeoIpService received IP: ${ip}`);

    if (!ip || ip.trim() === '') {
      this._logger.warn('GeoIpService received empty or invalid IP. Returning Unknown.');
      return 'Unknown';
    }

    try {
      let url = `https://ipinfo.io/${ip}/json`;

      if (this._ipinfoApiKey) {
        url = `https://ipinfo.io/${ip}/json?token=${this._ipinfoApiKey}`;
      }

      const response = await axios.get(url);
      const country = response.data.country || 'Unknown';
      this._logger.log(`GeoIpService for IP ${ip} returned country: ${country}`);
      return country;
    } catch (error) {
      this._logger.warn(`GeoIP lookup failed for IP ${ip} using IPinfo.io: ${error.message}`);
      if (axios.isAxiosError(error) && error.response) {
        this._logger.warn(`IPinfo.io error response: ${JSON.stringify(error.response.data)}`);
      }
      return 'Unknown';
    }
  }
}
