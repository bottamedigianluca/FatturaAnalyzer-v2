"""
CORS middleware configuration for Tauri and web frontends
"""

from typing import List, Union
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

class CORSConfig:
    """
    Configurazione CORS per diverse tipologie di frontend
    """
    
    # Origins permessi per Tauri
    TAURI_ORIGINS = [
        "tauri://localhost",
        "https://tauri.localhost",
        "tauri://app.localhost",
        "https://app.localhost",
    ]
    
    # Origins per sviluppo locale
    DEV_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:1420",  # Tauri dev server
        "http://127.0.0.1:1420",
        "http://localhost:8080",  # Vue/React dev
        "http://127.0.0.1:8080",
        "http://localhost:5173",  # Vite dev server
        "http://127.0.0.1:5173",
    ]
    
    # Origins per produzione (da configurare per deploy)
    PROD_ORIGINS = [
        # Aggiungi qui i domini di produzione quando necessario
        # "https://your-domain.com",
        # "https://app.your-domain.com",
    ]
    
    @classmethod
    def get_allowed_origins(cls) -> List[str]:
        """Ottiene lista di origins permessi basata sull'ambiente"""
        origins = cls.TAURI_ORIGINS.copy()
        
        if settings.DEBUG:
            origins.extend(cls.DEV_ORIGINS)
        else:
            origins.extend(cls.PROD_ORIGINS)
        
        return origins
    
    @classmethod
    def get_cors_kwargs(cls) -> dict:
        """Ottiene configurazione CORS completa"""
        return {
            "allow_origins": cls.get_allowed_origins(),
            "allow_credentials": True,
            "allow_methods": [
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"
            ],
            "allow_headers": [
                "Accept",
                "Accept-Language",
                "Content-Language",
                "Content-Type",
                "Authorization",
                "X-Requested-With",
                "X-API-Key",
                "X-Request-ID",
                "Cache-Control",
                "Pragma",
                "Origin",
                "User-Agent",
                "DNT",
                "If-Modified-Since",
                "Keep-Alive",
                "X-Custom-Header",
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Methods",
                "Access-Control-Allow-Headers",
            ],
            "expose_headers": [
                "Content-Range",
                "X-Content-Range",
                "X-Total-Count",
                "X-Request-ID",
                "X-API-Version",
            ],
            "max_age": 600,  # 10 minuti per preflight cache
        }


def add_cors_middleware(app, custom_origins: List[str] = None):
    """
    Aggiunge middleware CORS all'app FastAPI
    
    Args:
        app: Istanza FastAPI
        custom_origins: Liste di origins personalizzati da aggiungere
    """
    cors_config = CORSConfig.get_cors_kwargs()
    
    if custom_origins:
        cors_config["allow_origins"].extend(custom_origins)
    
    app.add_middleware(CORSMiddleware, **cors_config)
    
    return app


# Configurazione per sviluppo locale avanzato
def add_development_cors(app):
    """
    Configurazione CORS permissiva per sviluppo locale
    """
    if settings.DEBUG:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],  # Permissivo per sviluppo
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        add_cors_middleware(app)
    
    return app


# Headers di sicurezza per produzione
def add_security_headers_middleware(app):
    """
    Aggiunge headers di sicurezza per produzione
    """
    from starlette.middleware.base import BaseHTTPMiddleware
    from starlette.requests import Request
    from starlette.responses import Response
    
    class SecurityHeadersMiddleware(BaseHTTPMiddleware):
        async def dispatch(self, request: Request, call_next):
            response = await call_next(request)
            
            if not settings.DEBUG:
                # Headers di sicurezza per produzione
                response.headers["X-Content-Type-Options"] = "nosniff"
                response.headers["X-Frame-Options"] = "DENY"
                response.headers["X-XSS-Protection"] = "1; mode=block"
                response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
                response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
                
                # CSP per Tauri app
                response.headers["Content-Security-Policy"] = (
                    "default-src 'self' tauri:; "
                    "script-src 'self' 'unsafe-inline' tauri:; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data: tauri:; "
                    "font-src 'self'; "
                    "connect-src 'self' ws: wss: tauri:;"
                )
            
            return response
    
    app.add_middleware(SecurityHeadersMiddleware)
    return app


# Utilità per validare origins
def is_tauri_origin(origin: str) -> bool:
    """Verifica se un origin è da app Tauri"""
    return any(origin.startswith(tauri_origin) for tauri_origin in CORSConfig.TAURI_ORIGINS)


def validate_origin(origin: str) -> bool:
    """Valida se un origin è permesso"""
    allowed_origins = CORSConfig.get_allowed_origins()
    return origin in allowed_origins or (settings.DEBUG and origin.startswith("http://localhost"))
