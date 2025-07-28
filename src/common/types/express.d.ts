declare namespace Express {
  interface Request {
    ipAddress?: string;
    userAgent?: string;
  }
}
