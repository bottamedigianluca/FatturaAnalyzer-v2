"""
Error handling middleware for FastAPI
"""

import logging
import traceback
from typing import Callable
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Middleware per gestire errori globali e logging
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            response = await call_next(request)
            return response
            
        except HTTPException as http_exc:
            # HTTPException già gestite da FastAPI
            logger.warning(f"HTTP {http_exc.status_code}: {http_exc.detail} - {request.url}")
            raise
            
        except ValueError as ve:
            logger.error(f"Validation error: {ve} - {request.url}")
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Validation Error",
                    "message": str(ve),
                    "type": "validation_error"
                }
            )
            
        except FileNotFoundError as fnf:
            logger.error(f"File not found: {fnf} - {request.url}")
            return JSONResponse(
                status_code=404,
                content={
                    "success": False,
                    "error": "File Not Found",
                    "message": "Requested file or resource not found",
                    "type": "file_not_found"
                }
            )
            
        except PermissionError as pe:
            logger.error(f"Permission error: {pe} - {request.url}")
            return JSONResponse(
                status_code=403,
                content={
                    "success": False,
                    "error": "Permission Denied",
                    "message": "Insufficient permissions to access resource",
                    "type": "permission_error"
                }
            )
            
        except ConnectionError as ce:
            logger.error(f"Connection error: {ce} - {request.url}")
            return JSONResponse(
                status_code=503,
                content={
                    "success": False,
                    "error": "Service Unavailable",
                    "message": "Database or external service connection failed",
                    "type": "connection_error"
                }
            )
            
        except Exception as e:
            # Log completo dell'errore
            error_id = f"ERR_{hash(str(e)) % 10000:04d}"
            logger.error(
                f"Unexpected error [{error_id}] at {request.url}: {e}",
                exc_info=True
            )
            
            # In produzione, nasconde dettagli tecnici
            from app.config import settings
            if settings.DEBUG:
                error_detail = {
                    "error_id": error_id,
                    "exception_type": type(e).__name__,
                    "exception_message": str(e),
                    "traceback": traceback.format_exc()
                }
            else:
                error_detail = {
                    "error_id": error_id,
                    "message": "An internal error occurred. Please contact support with the error ID."
                }
            
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred",
                    "type": "internal_error",
                    "details": error_detail
                }
            )


class DatabaseErrorHandler:
    """
    Handler specifico per errori database
    """
    
    @staticmethod
    def handle_database_error(error: Exception) -> JSONResponse:
        """Gestisce errori specifici del database"""
        
        error_message = str(error).lower()
        
        # Errori di integrità
        if "unique constraint" in error_message or "integrity error" in error_message:
            return JSONResponse(
                status_code=409,
                content={
                    "success": False,
                    "error": "Conflict",
                    "message": "Resource already exists or violates database constraints",
                    "type": "integrity_error"
                }
            )
        
        # Errori di foreign key
        if "foreign key" in error_message:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Bad Request",
                    "message": "Referenced resource does not exist",
                    "type": "foreign_key_error"
                }
            )
        
        # Errori di connessione database
        if any(keyword in error_message for keyword in ["database is locked", "connection", "timeout"]):
            return JSONResponse(
                status_code=503,
                content={
                    "success": False,
                    "error": "Service Unavailable",
                    "message": "Database temporarily unavailable",
                    "type": "database_connection_error"
                }
            )
        
        # Errore generico database
        logger.error(f"Database error: {error}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Database Error",
                "message": "A database error occurred",
                "type": "database_error"
            }
        )


# Exception handlers specifici per FastAPI
async def validation_exception_handler(request: Request, exc: ValueError):
    """Handler per errori di validazione"""
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "Validation Error",
            "message": str(exc),
            "type": "validation_error"
        }
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    """Handler personalizzato per HTTPException"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "message": exc.detail,
            "type": "http_error"
        }
    )


# Utilità per logging strutturato
def log_request_error(request: Request, error: Exception, context: str = ""):
    """Log strutturato per errori di richiesta"""
    logger.error(
        f"Request error in {context}",
        extra={
            "url": str(request.url),
            "method": request.method,
            "headers": dict(request.headers),
            "error_type": type(error).__name__,
            "error_message": str(error),
            "context": context
        },
        exc_info=True
    )
