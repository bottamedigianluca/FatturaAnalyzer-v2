"""
Cloud Sync API endpoints for Google Drive integration
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.models import SyncStatus, SyncResult, APIResponse
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/status", response_model=SyncStatus)
async def get_sync_status():
    """Get current cloud sync status"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        status = sync_manager.get_sync_status()
        
        return SyncStatus(
            enabled=status['enabled'],
            service_available=status['service_available'],
            remote_file_id=status.get('remote_file_id'),
            last_sync_time=status.get('last_sync_time'),
            auto_sync_running=status['auto_sync_running']
        )
        
    except Exception as e:
        logger.error(f"Error getting sync status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving sync status")


@router.post("/enable", response_model=APIResponse)
async def enable_sync():
    """Enable cloud synchronization"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        
        # Check if Google Drive service is available
        if not sync_manager.service:
            raise HTTPException(
                status_code=400, 
                detail="Google Drive service not available. Please check credentials configuration."
            )
        
        # Enable sync in configuration
        sync_manager.sync_enabled = True
        sync_manager._save_config()
        
        # Start auto-sync if enabled
        sync_manager.start_auto_sync()
        
        return APIResponse(
            success=True,
            message="Cloud synchronization enabled successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enabling sync: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error enabling synchronization")


@router.post("/disable", response_model=APIResponse)
async def disable_sync():
    """Disable cloud synchronization"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        
        # Stop auto-sync
        sync_manager.stop_auto_sync()
        
        # Disable sync in configuration
        sync_manager.sync_enabled = False
        sync_manager._save_config()
        
        return APIResponse(
            success=True,
            message="Cloud synchronization disabled successfully"
        )
        
    except Exception as e:
        logger.error(f"Error disabling sync: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error disabling synchronization")


@router.post("/manual", response_model=SyncResult)
async def manual_sync(
    force_direction: Optional[str] = Query(None, description="Force sync direction: upload, download")
):
    """Perform manual synchronization"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        
        if not sync_manager.service:
            raise HTTPException(
                status_code=400,
                detail="Google Drive service not available. Please check credentials configuration."
            )
        
        # Validate force_direction parameter
        if force_direction and force_direction not in ['upload', 'download']:
            raise HTTPException(
                status_code=400,
                detail="force_direction must be 'upload' or 'download'"
            )
        
        # Perform synchronization
        result = sync_manager.sync_database(force_direction=force_direction)
        
        return SyncResult(
            success=result['success'],
            action=result.get('action'),
            message=result['message'],
            timestamp=result['timestamp']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error performing manual sync: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error performing synchronization")


@router.post("/upload", response_model=SyncResult)
async def force_upload():
    """Force upload local database to cloud"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        
        if not sync_manager.service:
            raise HTTPException(
                status_code=400,
                detail="Google Drive service not available"
            )
        
        result = sync_manager.sync_database(force_direction='upload')
        
        return SyncResult(
            success=result['success'],
            action=result.get('action'),
            message=result['message'],
            timestamp=result['timestamp']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error forcing upload: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error uploading to cloud")


@router.post("/download", response_model=SyncResult)
async def force_download():
    """Force download database from cloud"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        
        if not sync_manager.service:
            raise HTTPException(
                status_code=400,
                detail="Google Drive service not available"
            )
        
        result = sync_manager.sync_database(force_direction='download')
        
        return SyncResult(
            success=result['success'],
            action=result.get('action'),
            message=result['message'],
            timestamp=result['timestamp']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error forcing download: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error downloading from cloud")


@router.get("/history")
async def get_sync_history(
    limit: int = Query(20, ge=1, le=100, description="Number of sync events to return")
):
    """Get synchronization history"""
    try:
        # In a real implementation, you would store sync events in a database table
        # For now, we'll return mock data
        
        sync_history = [
            {
                "id": 1,
                "timestamp": "2024-01-15T10:30:00Z",
                "action": "upload",
                "success": True,
                "message": "Database uploaded successfully",
                "file_size": "2.5 MB",
                "duration_ms": 3500
            },
            {
                "id": 2,
                "timestamp": "2024-01-15T08:15:00Z",
                "action": "download",
                "success": True,
                "message": "Database downloaded successfully",
                "file_size": "2.4 MB",
                "duration_ms": 2800
            },
            {
                "id": 3,
                "timestamp": "2024-01-14T16:45:00Z",
                "action": "auto",
                "success": False,
                "message": "Network error during sync",
                "file_size": None,
                "duration_ms": 15000
            }
        ]
        
        return APIResponse(
            success=True,
            message=f"Retrieved {len(sync_history)} sync events",
            data={
                "history": sync_history[:limit],
                "total": len(sync_history)
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting sync history: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving sync history")


@router.post("/auto-sync/start", response_model=APIResponse)
async def start_auto_sync():
    """Start automatic synchronization"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        
        if not sync_manager.sync_enabled:
            raise HTTPException(
                status_code=400,
                detail="Sync must be enabled before starting auto-sync"
            )
        
        if not sync_manager.service:
            raise HTTPException(
                status_code=400,
                detail="Google Drive service not available"
            )
        
        sync_manager.start_auto_sync()
        
        return APIResponse(
            success=True,
            message=f"Auto-sync started with {sync_manager.auto_sync_interval} second interval"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting auto-sync: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error starting auto-sync")


@router.post("/auto-sync/stop", response_model=APIResponse)
async def stop_auto_sync():
    """Stop automatic synchronization"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        sync_manager.stop_auto_sync()
        
        return APIResponse(
            success=True,
            message="Auto-sync stopped successfully"
        )
        
    except Exception as e:
        logger.error(f"Error stopping auto-sync: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error stopping auto-sync")


@router.put("/auto-sync/interval", response_model=APIResponse)
async def update_auto_sync_interval(
    interval_seconds: int = Query(..., ge=60, le=3600, description="Auto-sync interval in seconds (60-3600)")
):
    """Update auto-sync interval"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        
        # Update interval
        sync_manager.auto_sync_interval = interval_seconds
        sync_manager._save_config()
        
        # Restart auto-sync if it was running
        if sync_manager.sync_thread and sync_manager.sync_thread.is_alive():
            sync_manager.stop_auto_sync()
            sync_manager.start_auto_sync()
        
        return APIResponse(
            success=True,
            message=f"Auto-sync interval updated to {interval_seconds} seconds"
        )
        
    except Exception as e:
        logger.error(f"Error updating auto-sync interval: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error updating auto-sync interval")


@router.get("/remote-info")
async def get_remote_file_info():
    """Get information about the remote file on Google Drive"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        
        if not sync_manager.service:
            raise HTTPException(
                status_code=400,
                detail="Google Drive service not available"
            )
        
        if not sync_manager.remote_file_id:
            return APIResponse(
                success=True,
                message="No remote file found",
                data={"exists": False}
            )
        
        try:
            # Get file metadata from Google Drive
            file_metadata = sync_manager.service.files().get(
                fileId=sync_manager.remote_file_id,
                fields='id,name,size,modifiedTime,createdTime,md5Checksum'
            ).execute()
            
            remote_modified_time = sync_manager._get_remote_modified_time()
            local_modified_time = sync_manager._get_local_modified_time()
            
            return APIResponse(
                success=True,
                message="Remote file information retrieved",
                data={
                    "exists": True,
                    "file_id": file_metadata['id'],
                    "name": file_metadata['name'],
                    "size": int(file_metadata.get('size', 0)),
                    "size_mb": round(int(file_metadata.get('size', 0)) / (1024*1024), 2),
                    "created_time": file_metadata.get('createdTime'),
                    "modified_time": file_metadata.get('modifiedTime'),
                    "md5_checksum": file_metadata.get('md5Checksum'),
                    "local_modified_time": local_modified_time.isoformat() if local_modified_time else None,
                    "remote_modified_time": remote_modified_time.isoformat() if remote_modified_time else None,
                    "sync_needed": (local_modified_time and remote_modified_time and 
                                  local_modified_time != remote_modified_time)
                }
            )
            
        except Exception as file_error:
            logger.warning(f"Error getting remote file info: {file_error}")
            return APIResponse(
                success=True,
                message="Remote file not accessible or doesn't exist",
                data={"exists": False, "error": str(file_error)}
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting remote file info: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving remote file information")


@router.delete("/remote-file", response_model=APIResponse)
async def delete_remote_file():
    """Delete the remote database file from Google Drive"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        
        if not sync_manager.service:
            raise HTTPException(
                status_code=400,
                detail="Google Drive service not available"
            )
        
        if not sync_manager.remote_file_id:
            return APIResponse(
                success=True,
                message="No remote file to delete"
            )
        
        try:
            # Delete file from Google Drive
            sync_manager.service.files().delete(fileId=sync_manager.remote_file_id).execute()
            
            # Clear remote file ID from config
            sync_manager.remote_file_id = None
            sync_manager._save_config()
            
            return APIResponse(
                success=True,
                message="Remote file deleted successfully"
            )
            
        except Exception as delete_error:
            logger.error(f"Error deleting remote file: {delete_error}")
            raise HTTPException(
                status_code=500,
                detail=f"Error deleting remote file: {str(delete_error)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting remote file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error deleting remote file")


@router.post("/test-connection", response_model=APIResponse)
async def test_google_drive_connection():
    """Test Google Drive API connection and permissions"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        
        if not sync_manager.service:
            return APIResponse(
                success=False,
                message="Google Drive service not available. Check credentials configuration."
            )
        
        try:
            # Test basic API access
            about = sync_manager.service.about().get(fields='user,storageQuota').execute()
            
            # Test file listing permission
            files_list = sync_manager.service.files().list(
                pageSize=1,
                fields='files(id,name)'
            ).execute()
            
            user_info = about.get('user', {})
            storage_info = about.get('storageQuota', {})
            
            return APIResponse(
                success=True,
                message="Google Drive connection successful",
                data={
                    "user": {
                        "email": user_info.get('emailAddress'),
                        "display_name": user_info.get('displayName')
                    },
                    "storage": {
                        "limit": storage_info.get('limit'),
                        "usage": storage_info.get('usage'),
                        "usage_in_drive": storage_info.get('usageInDrive')
                    },
                    "permissions": {
                        "can_list_files": len(files_list.get('files', [])) >= 0,
                        "can_access_about": True
                    }
                }
            )
            
        except Exception as api_error:
            logger.error(f"Google Drive API test failed: {api_error}")
            return APIResponse(
                success=False,
                message=f"Google Drive API test failed: {str(api_error)}"
            )
        
    except Exception as e:
        logger.error(f"Error testing Google Drive connection: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error testing connection")


@router.get("/config")
async def get_sync_configuration():
    """Get current sync configuration"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        
        config_data = {
            "sync_enabled": sync_manager.sync_enabled,
            "auto_sync_interval": sync_manager.auto_sync_interval,
            "remote_file_name": sync_manager.remote_db_name,
            "credentials_file_exists": os.path.exists(sync_manager.credentials_file),
            "token_file_exists": os.path.exists(sync_manager.token_file),
            "service_available": sync_manager.service is not None,
            "remote_file_id": sync_manager.remote_file_id
        }
        
        return APIResponse(
            success=True,
            message="Sync configuration retrieved",
            data=config_data
        )
        
    except Exception as e:
        logger.error(f"Error getting sync configuration: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving sync configuration")


@router.post("/setup-credentials", response_model=APIResponse)
async def setup_credentials_guide():
    """Get instructions for setting up Google Drive credentials"""
    try:
        instructions = {
            "steps": [
                {
                    "step": 1,
                    "title": "Create Google Cloud Project",
                    "description": "Go to Google Cloud Console and create a new project or select existing one"
                },
                {
                    "step": 2,
                    "title": "Enable Google Drive API",
                    "description": "In the API Library, search for and enable the Google Drive API"
                },
                {
                    "step": 3,
                    "title": "Create Credentials",
                    "description": "Go to Credentials > Create Credentials > OAuth 2.0 Client ID"
                },
                {
                    "step": 4,
                    "title": "Configure OAuth Consent",
                    "description": "Set up OAuth consent screen with your application information"
                },
                {
                    "step": 5,
                    "title": "Download Credentials",
                    "description": "Download the credentials JSON file and save as 'google_credentials.json'"
                },
                {
                    "step": 6,
                    "title": "Authorize Application",
                    "description": "Run the sync setup to authorize the application and generate token"
                }
            ],
            "required_files": [
                {
                    "filename": "google_credentials.json",
                    "description": "OAuth 2.0 client credentials from Google Cloud Console",
                    "location": "Same directory as config.ini"
                },
                {
                    "filename": "google_token.json",
                    "description": "Generated automatically after first authorization",
                    "location": "Same directory as config.ini"
                }
            ],
            "scopes_needed": [
                "https://www.googleapis.com/auth/drive.file"
            ]
        }
        
        return APIResponse(
            success=True,
            message="Credentials setup instructions",
            data=instructions
        )
        
    except Exception as e:
        logger.error(f"Error getting setup instructions: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving setup instructions")


@router.post("/reset-authorization", response_model=APIResponse)
async def reset_authorization():
    """Reset Google Drive authorization (delete token file)"""
    try:
        from app.core.cloud_sync import get_sync_manager
        
        sync_manager = get_sync_manager()
        
        # Stop auto-sync first
        sync_manager.stop_auto_sync()
        
        # Delete token file if it exists
        if os.path.exists(sync_manager.token_file):
            os.remove(sync_manager.token_file)
            logger.info("Token file deleted")
        
        # Reset service
        sync_manager.service = None
        
        return APIResponse(
            success=True,
            message="Authorization reset. Please re-authorize the application to use sync features."
        )
        
    except Exception as e:
        logger.error(f"Error resetting authorization: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Error resetting authorization")


import os