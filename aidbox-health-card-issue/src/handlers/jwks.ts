import { Request, Response } from 'express';
import { JWKSService } from '../services/jwks';

export class JWKSHandler {
  constructor(private jwksService: JWKSService) {}

  handleWellKnownJWKS = (req: Request, res: Response): void => {
    try {
      const jwks = this.jwksService.getJWKS();

      // Set caching headers (24 hours)
      res.header('Cache-Control', 'public, max-age=86400');
      res.header('Expires', new Date(Date.now() + 86400000).toUTCString());

      res.status(200).json(jwks);
    } catch (error) {
      console.error('JWKS endpoint error:', error);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate JWKS'
      });
    }
  };
}