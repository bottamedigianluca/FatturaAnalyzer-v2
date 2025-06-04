"""
Authentication and security middleware for FastAPI
Per applicazione desktop locale, implementazione semplificata ma estendibile
"""

import logging
import secrets
import time
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

class APIKeyAuth:
    """
    Autenticazione semplice con API Key per applicazione locale
    Utile per proteggere l'API se esposta sulla rete
    """
    
    def __init__(self):
        self.api_keys: Dict[str, Dict[str, Any]] = {}
        self.load_api_keys()
    
    def load_api_keys(self):
        """Carica API keys da configurazione o genera chiave locale"""
        from app.config import settings
        
        # Per applicazione locale, genera chiave temporanea se necessario
        local_key = getattr(settings, 'LOCAL_API_KEY', None)
        if not local_key:
            local_key = self.generate_api_key()
            logger.info(f"Generated local API key: {local_key}")
        
        self.api_keys[local_key] = {
            'name': 'local_app',
            'created_at': datetime.now(),
            'permissions': ['read', 'write', 'admin'],
            'active': True
        }
    
    def generate_api_key(self, length: int = 32) -> str:
        """Genera API key sicura"""
        return secrets.token_urlsafe(length)
    
    def validate_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Valida API key e restituisce info associata"""
        key_info = self.api_keys.get(api_key)
        if key_info and key_info.get('active', False):
            return key_info
        return None
    
    def create_api_key(self, name: str, permissions: list = None) -> str:
        """Crea nuova API key"""
        api_key = self.generate_api_key()
        self.api_keys[api_key] = {
            'name': name,
            'created_at': datetime.now(),
            'permissions': permissions or ['read'],
            'active': True
        }
        return api_key
    
    def revoke_api_key(self, api_key: str) -> bool:
        """Revoca API key"""
        if api_key in self.api_keys:
            self.api_keys[api_key]['active'] = False
            return True
        return False


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware per proteggere da abusi
    """
    
    def __init__(self, app, calls_per_minute: int = 60):
        super().__init__(app)
        self.calls_per_minute = calls_per_minute
        self.clients: Dict[str, list] = {}
    
    def get_client_ip(self, request: Request) -> str:
        """Ottiene IP del client"""
        # Per app locale, usa sempre localhost
        return request.client.host if request.client else "127.0.0.1"
    
    def clean_old_requests(self, client_ip: str):
        """Pulisce richieste vecchie per il client"""
        if client_ip in self.clients:
            current_time = time.time()
            # Mantieni solo richieste dell'ultimo minuto
            self.clients[client_ip] = [
                req_time for req_time in self.clients[client_ip]
                if current_time - req_time < 60
            ]
    
    async def dispatch(self, request: Request, call_next):
        client_ip = self.get_client_ip(request)
        current_time = time.time()
        
        # Per app locale, rate limiting più permissivo
        if client_ip in ["127.0.0.1", "localhost", "::1"]:
            # Permetti più richieste per app locale
            max_calls = self.calls_per_minute * 2
        else:
            max_calls = self.calls_per_minute
        
        # Inizializza o pulisce requests per client
        if client_ip not in self.clients:
            self.clients[client_ip] = []
        else:
            self.clean_old_requests(client_ip)
        
        # Controlla rate limit
        if len(self.clients[client_ip]) >= max_calls:
            logger.warning(f"Rate limit exceeded for {client_ip}")
            return Response(
                content='{"error": "Rate limit exceeded", "message": "Too many requests"}',
                status_code=429,
                media_type="application/json"
            )
        
        # Aggiungi richiesta corrente
        self.clients[client_ip].append(current_time)
        
        response = await call_next(request)
        return response


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Middleware per sicurezza generale
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.blocked_ips: set = set()
        self.suspicious_patterns = [
            'sql injection',
            'script>',
            'union select',
            'drop table',
            'xss',
            'javascript:',
        ]
    
    def is_suspicious_request(self, request: Request) -> bool:
        """Controlla se la richiesta è sospetta"""
        # Controlla URL
        url_lower = str(request.url).lower()
        if any(pattern in url_lower for pattern in self.suspicious_patterns):
            return True
        
        # Controlla headers
        for header_name, header_value in request.headers.items():
            if any(pattern in header_value.lower() for pattern in self.suspicious_patterns):
                return True
        
        return False
    
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"
        
        # Blocca IP sospetti
        if client_ip in self.blocked_ips:
            logger.warning(f"Blocked request from {client_ip}")
            return Response(
                content='{"error": "Blocked", "message": "Access denied"}',
                status_code=403,
                media_type="application/json"
            )
        
        # Controlla richieste sospette
        if self.is_suspicious_request(request):
            logger.warning(f"Suspicious request from {client_ip}: {request.url}")
            # Per ora solo log, in futuro si potrebbe bloccare
        
        response = await call_next(request)
        return response


# Istanze globali
api_key_auth = APIKeyAuth()
security = HTTPBearer(auto_error=False)

# Dependency functions
async def get_api_key(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[str]:
    """Dependency per ottenere API key da Authorization header"""
    if credentials:
        return credentials.credentials
    return None

async def require_api_key(api_key: str = Depends(get_api_key)) -> Dict[str, Any]:
    """Dependency che richiede API key valida"""
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    key_info = api_key_auth.validate_api_key(api_key)
    if not key_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return key_info

async def require_permission(permission: str):
    """Factory per dependency che richiede permesso specifico"""
    async def check_permission(key_info: Dict[str, Any] = Depends(require_api_key)) -> Dict[str, Any]:
        if permission not in key_info.get('permissions', []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return key_info
    return check_permission

# Dependencies per permessi comuni
require_read = require_permission('read')
require_write = require_permission('write')
require_admin = require_permission('admin')

# Optional auth dependency (per endpoint pubblici con auth opzionale)
async def optional_api_key(api_key: str = Depends(get_api_key)) -> Optional[Dict[str, Any]]:
    """Dependency opzionale per API key"""
    if api_key:
        return api_key_auth.validate_api_key(api_key)
    return None

# Utilità per generare token temporanei
class TemporaryTokenManager:
    """Gestisce token temporanei per operazioni specifiche"""
    
    def __init__(self):
        self.tokens: Dict[str, Dict[str, Any]] = {}
    
    def create_token(self, purpose: str, expires_in_minutes: int = 60) -> str:
        """Crea token temporaneo"""
        token = secrets.token_urlsafe(16)
        expires_at = datetime.now() + timedelta(minutes=expires_in_minutes)
        
        self.tokens[token] = {
            'purpose': purpose,
            'created_at': datetime.now(),
            'expires_at': expires_at,
            'used': False
        }
        
        return token
    
    def validate_token(self, token: str, purpose: str = None) -> bool:
        """Valida token temporaneo"""
        token_info = self.tokens.get(token)
        if not token_info:
            return False
        
        # Controlla scadenza
        if datetime.now() > token_info['expires_at']:
            del self.tokens[token]
            return False
        
        # Controlla purpose se specificato
        if purpose and token_info['purpose'] != purpose:
            return False
        
        return True
    
    def use_token(self, token: str, purpose: str = None) -> bool:
        """Usa token (one-time use)"""
        if self.validate_token(token, purpose):
            token_info = self.tokens[token]
            if not token_info['used']:
                token_info['used'] = True
                return True
        return False
    
    def cleanup_expired_tokens(self):
        """Pulisce token scaduti"""
        current_time = datetime.now()
        expired_tokens = [
            token for token, info in self.tokens.items()
            if current_time > info['expires_at']
        ]
        for token in expired_tokens:
            del self.tokens[token]

# Istanza globale per token temporanei
temp_token_manager = TemporaryTokenManager()

# Configurazione middleware per l'app
def add_security_middleware(app):
    """Aggiunge tutti i middleware di sicurezza"""
    from app.config import settings
    
    # Rate limiting (più permissivo per dev)
    rate_limit = 120 if settings.DEBUG else 60
    app.add_middleware(RateLimitMiddleware, calls_per_minute=rate_limit)
    
    # Security middleware
    app.add_middleware(SecurityMiddleware)
    
    return app

# Export per uso semplificato
__all__ = [
    'api_key_auth', 'require_api_key', 'require_read', 'require_write', 'require_admin',
    'optional_api_key', 'temp_token_manager', 'add_security_middleware',
    'RateLimitMiddleware', 'SecurityMiddleware'
]
