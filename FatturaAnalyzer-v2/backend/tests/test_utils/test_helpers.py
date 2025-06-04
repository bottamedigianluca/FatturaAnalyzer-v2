# tests/test_utils/test_helpers.py
import pytest
from datetime import date, datetime
from decimal import Decimal
from app.core.utils import to_decimal, quantize, format_currency, format_percentage, calculate_invoice_hash, calculate_transaction_hash


def test_date_formatting_iso(): # Rinominato per chiarezza
    """Test formattazione date"""
    test_date = date(2024, 1, 15)
    assert test_date.isoformat() == "2024-01-15"

def test_to_decimal_conversion():
    """Test to_decimal robustezza"""
    assert to_decimal("1.234,56") == Decimal("1234.56")
    assert to_decimal("1,234.56") == Decimal("1234.56")
    assert to_decimal("100") == Decimal("100.00")
    assert to_decimal(100.5) == Decimal("100.50")
    assert to_decimal(None) == Decimal("0.00")
    assert to_decimal("invalid", default='1.0') == Decimal("1.00")
    assert to_decimal("€ 100,50") == Decimal("100.50")

def test_quantize_function():
    """Test quantize"""
    assert quantize(Decimal("123.456")) == Decimal("123.46")
    assert quantize(Decimal("123.454")) == Decimal("123.45")
    assert quantize(to_decimal(None)) == Decimal("0.00")

def test_currency_formatting():
    assert format_currency(1234.56) == "1.234,56 €"
    assert format_currency(Decimal("1234.56")) == "1.234,56 €"
    assert format_currency(0) == "0,00 €"
    assert format_currency(None) == "0,00 €"
    assert format_currency("invalid") == "0,00 €"

def test_percentage_formatting():
    assert format_percentage(25.5) == "+25,5%"
    assert format_percentage(Decimal("-10.25")) == "-10,3%" # Arrotonda
    assert format_percentage(0) == "+0,0%"
    assert format_percentage(None) == "--"

def test_calculate_invoice_hash_consistency():
    h1 = calculate_invoice_hash("PVA1", "CF2", "TD01", "N1", "2024-01-15")
    h2 = calculate_invoice_hash("PVA1", "CF2", "TD01", "N1", date(2024, 1, 15))
    h3 = calculate_invoice_hash(" PVA1 ", " CF2 ", " td01 ", " n1 ", "2024-01-15")
    assert h1 == h2 == h3
    h_diff_num = calculate_invoice_hash("PVA1", "CF2", "TD01", "N2", "2024-01-15")
    assert h1 != h_diff_num

def test_calculate_transaction_hash_consistency():
    h1 = calculate_transaction_hash("2024-01-15", "100.50", "Descrizione Test")
    h2 = calculate_transaction_hash(date(2024, 1, 15), Decimal("100.50"), "Descrizione Test")
    h3 = calculate_transaction_hash("2024-01-15", 100.5, " DESCRIZIONE TEST ")
    assert h1 == h2 == h3
    h_diff_amount = calculate_transaction_hash("2024-01-15", "100.51", "Descrizione Test")
    assert h1 != h_diff_amount
