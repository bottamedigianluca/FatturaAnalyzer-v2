"""
Importer Adapter per FastAPI
Fornisce interfaccia async per il core/importer.py esistente senza modificarlo
"""

import asyncio
import logging
from typing import Dict, Any, Callable, Optional
from concurrent.futures import ThreadPoolExecutor
import pandas as pd
from io import StringIO

# Import del core esistente (INVARIATO)
from app.core.importer import import_from_source
from app.core.parser_csv import parse_bank_csv
from app.core.parser_xml import parse_fattura_xml
from app.core.parser_p7m import extract_xml_from_p7m

logger = logging.getLogger(__name__)

# Thread pool per operazioni sincrone del core
_thread_pool = ThreadPoolExecutor(max_workers=2)  # Meno workers per I/O intensivo

class ImporterAdapter:
    """
    Adapter che fornisce interfaccia async per gli importer del core esistente
    """
    
    @staticmethod
    async def import_from_source_async(
        source_path: str,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """Versione async di import_from_source"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            import_from_source,
            source_path,
            progress_callback
        )
    
    @staticmethod
    async def parse_bank_csv_async(csv_content: str) -> Optional[pd.DataFrame]:
        """Versione async di parse_bank_csv"""
        def _parse_csv():
            csv_file = StringIO(csv_content)
            return parse_bank_csv(csv_file)
        
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_thread_pool, _parse_csv)
    
    @staticmethod
    async def parse_fattura_xml_async(
        xml_filepath: str,
        my_company_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Versione async di parse_fattura_xml"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            parse_fattura_xml,
            xml_filepath,
            my_company_data
        )
    
    @staticmethod
    async def extract_xml_from_p7m_async(p7m_filepath: str) -> Optional[str]:
        """Versione async di extract_xml_from_p7m"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            _thread_pool,
            extract_xml_from_p7m,
            p7m_filepath
        )

# Istanza globale dell'adapter
importer_adapter = ImporterAdapter()