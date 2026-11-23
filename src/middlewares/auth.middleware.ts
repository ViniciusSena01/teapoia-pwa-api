import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      usuario?: AuthPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'teapoia-dev-secret-change-in-production-2026';

/**
 * Middleware de proteção de rotas privadas (TEA-06, TEA-23)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      sucesso: false,
      mensagem: 'Autenticação necessária. Token não fornecido.'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.usuario = {
      id: decoded.id,
      email: decoded.email
    };
    next();
  } catch {
    res.status(401).json({
      sucesso: false,
      mensagem: 'Sessão inválida ou expirada. Faça login novamente.'
    });
  }
}

/**
 * Rate Limiter em memória para proteger endpoints sensíveis (TEA-05, TEA-07, TEA-23)
 */
const tentativasPorIp = new Map<string, { contagem: number; expiraEm: number }>();

export function rateLimitSensivel(maxTentativas = 10, janelaMinutos = 15) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const chave = `${ip}:${req.baseUrl}${req.path}`;
    const agora = Date.now();
    const registro = tentativasPorIp.get(chave);

    if (!registro || agora > registro.expiraEm) {
      tentativasPorIp.set(chave, {
        contagem: 1,
        expiraEm: agora + janelaMinutos * 60 * 1000
      });
      next();
      return;
    }

    if (registro.contagem >= maxTentativas) {
      res.status(429).json({
        sucesso: false,
        mensagem: 'Muitas tentativas em curto período. Aguarde alguns minutos antes de tentar novamente.'
      });
      return;
    }

    registro.contagem += 1;
    next();
  };
}
