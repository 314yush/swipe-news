"""
Avantis Trader with Privy Integration
Refactored from trader.py to use Privy's server-side signing
"""

import asyncio
import os
import ssl
from typing import Optional
from dataclasses import dataclass
from enum import Enum

# Configure SSL to use certifi certificates (fixes macOS SSL certificate issues)
# This is necessary because Python on macOS may not have access to system certificates
import certifi

# Set SSL certificate file environment variables
# These are used by requests, httpx, and other HTTP libraries
os.environ.setdefault('SSL_CERT_FILE', certifi.where())
os.environ.setdefault('REQUESTS_CA_BUNDLE', certifi.where())

# Patch Python's default SSL context to use certifi certificates
# This ensures all SSL connections use certifi's certificate bundle
_original_create_default_context = ssl.create_default_context
def _patched_create_default_context(*args, **kwargs):
    """Create SSL context with certifi certificates."""
    if 'cafile' not in kwargs:
        kwargs['cafile'] = certifi.where()
    return _original_create_default_context(*args, **kwargs)
ssl.create_default_context = _patched_create_default_context

from avantis_trader_sdk import TraderClient
from avantis_trader_sdk.types import TradeInput, TradeInputOrderType
from privy_signer import PrivySigner


class PositionSide(Enum):
    """Position direction."""
    LONG = True
    SHORT = False


@dataclass
class TradeResult:
    """Result of a trade operation."""
    success: bool
    tx_hash: Optional[str] = None
    message: str = ""
    error: Optional[str] = None
    entry_price: Optional[float] = None
    trade_id: Optional[str] = None
    pair_index: Optional[int] = None
    trade_index: Optional[int] = None


class AvantisTraderPrivy:
    """
    Avantis Trader using Privy for transaction signing.
    Private keys remain in Privy's secure environment.
    """
    
    def __init__(
        self,
        rpc_url: str,
        privy_user_id: str,
        wallet_address: str,
        default_leverage: int = 75,
        default_slippage: float = 1.0
    ):
        """
        Initialize the Avantis Trader with Privy.
        
        Args:
            rpc_url: Base Mainnet RPC URL
            privy_user_id: Privy user ID
            wallet_address: Wallet address (embedded wallet)
            default_leverage: Default leverage for trades
            default_slippage: Default slippage percentage
        """
        self.rpc_url = rpc_url
        self.privy_user_id = privy_user_id
        self.wallet_address = wallet_address
        self.default_leverage = default_leverage
        self.default_slippage = default_slippage
        
        self.client: Optional[TraderClient] = None
        self.privy_signer: Optional[PrivySigner] = None
        self._initialized = False
    
    async def initialize(self) -> None:
        """Initialize the trader client and Privy signer."""
        if self._initialized:
            return
        
        # Initialize TraderClient with RPC URL
        # SSL certificate verification is handled globally via the SSL context patch
        # at the top of this file, which ensures certifi certificates are used
        self.client = TraderClient(self.rpc_url)
        self.privy_signer = PrivySigner(self.privy_user_id, self.wallet_address)
        
        # Note: The Avantis SDK expects a local signer, but we're using Privy
        # We'll need to intercept signing calls and route them through Privy
        # This may require SDK modifications or a custom signer adapter
        
        self._initialized = True
    
    def _ensure_initialized(self) -> None:
        """Ensure the trader is initialized."""
        if not self._initialized:
            raise RuntimeError("Trader not initialized. Call await trader.initialize() first.")
    
    async def get_current_price(self, pair: str) -> float:
        """Get the current price for a trading pair."""
        self._ensure_initialized()
        price_data = await self.client.feed_client.get_latest_price_updates([pair])
        return price_data.parsed[0].converted_price
    
    async def get_pair_index(self, pair: str) -> int:
        """Get the pair index for a trading pair."""
        self._ensure_initialized()
        return await self.client.pairs_cache.get_pair_index(pair)
    
    async def get_open_positions(self):
        """Get all open positions for the connected wallet."""
        self._ensure_initialized()
        trades, pending_orders = await self.client.trade.get_trades(self.wallet_address)
        return trades
    
    async def build_unsigned_transaction(
        self,
        pair: str,
        side: PositionSide,
        collateral: float,
        leverage: Optional[int] = None,
        take_profit_percent: float = 200.0  # Default to 200%
    ) -> dict:
        """
        Build an unsigned transaction for client-side signing.
        
        Args:
            pair: Trading pair (e.g., 'ETH/USD')
            side: Position side (LONG or SHORT)
            collateral: Amount of USDC to use as collateral
            leverage: Leverage multiplier
            take_profit_percent: Take profit percentage (default 200%)
            
        Returns:
            Dictionary with unsigned transaction data
        """
        self._ensure_initialized()
        
        leverage = leverage or self.default_leverage
        
        # Parallelize network calls for better performance
        # Get pair index, current price, and open positions concurrently
        pair_index, current_price, existing_positions = await asyncio.gather(
            self.get_pair_index(pair),
            self.get_current_price(pair),
            self.get_open_positions()
        )
        
        # Calculate take profit price
        if side == PositionSide.LONG:
            take_profit = current_price * (1 + take_profit_percent / 100)
        else:
            take_profit = current_price * (1 - take_profit_percent / 100)
        
        # Determine trade index (for multiple positions on same pair)
        pair_positions = [
            t for t in existing_positions 
            if t.trade.pair_index == pair_index
        ]
        
        if pair_positions:
            trade_index = max(t.trade.trade_index for t in pair_positions) + 1
        else:
            trade_index = 0
        
        # Create trade input
        trade_input = TradeInput(
            trader=self.wallet_address,
            open_price=None,  # Will use current market price
            pair_index=pair_index,
            collateral_in_trade=collateral,
            is_long=side.value,
            leverage=leverage,
            index=trade_index,
            tp=take_profit,
            sl=0,  # No stop loss
            timestamp=0,
        )
        
        # Build transaction
        print(f"[TRADER] Building unsigned transaction for {pair}, side: {side}, collateral: {collateral}")
        tx = await self.client.trade.build_trade_open_tx(
            trade_input,
            TradeInputOrderType.MARKET,
            int(self.default_slippage)
        )
        print(f"[TRADER] Transaction built: {tx}")
        
        # Convert transaction to dict format for client-side signing
        if hasattr(tx, 'dict'):
            tx_dict = tx.dict()
        elif hasattr(tx, '__dict__'):
            tx_dict = tx.__dict__
        elif isinstance(tx, dict):
            tx_dict = tx
        else:
            import json
            try:
                tx_dict = json.loads(json.dumps(tx, default=str))
            except:
                tx_dict = {"raw": str(tx)}
        
        # Convert transaction to EIP-1559 format with hex strings for Privy
        # Privy's signTransaction expects all numeric fields as hex strings
        def to_hex(value):
            """Convert a value to hex string format."""
            if value is None:
                return None
            if isinstance(value, str):
                # If already hex string, return as-is
                if value.startswith('0x'):
                    return value
                # Try to parse as number and convert
                try:
                    num = int(value, 16) if value.startswith('0x') else int(value)
                    return hex(num)
                except:
                    return value
            if isinstance(value, (int, float)):
                return hex(int(value))
            return str(value)
        
        # Build EIP-1559 transaction format
        eip1559_tx = {}
        
        # Required fields
        if 'to' in tx_dict or 'to_address' in tx_dict or hasattr(tx, 'to'):
            eip1559_tx['to'] = tx_dict.get('to') or tx_dict.get('to_address') or getattr(tx, 'to', None)
            if eip1559_tx['to'] and not eip1559_tx['to'].startswith('0x'):
                eip1559_tx['to'] = '0x' + eip1559_tx['to'].lstrip('0x')
        
        # Value (in wei, as hex)
        value = tx_dict.get('value') or tx_dict.get('amount') or getattr(tx, 'value', 0)
        eip1559_tx['value'] = to_hex(value) or '0x0'
        
        # Data (call data, as hex)
        data = tx_dict.get('data') or tx_dict.get('input') or tx_dict.get('callData') or getattr(tx, 'data', None)
        if data:
            eip1559_tx['data'] = data if isinstance(data, str) and data.startswith('0x') else f'0x{data}'
        
        # Gas limit (as hex)
        gas = tx_dict.get('gas') or tx_dict.get('gasLimit') or getattr(tx, 'gas', None)
        if gas:
            eip1559_tx['gas'] = to_hex(gas)
        
        # Nonce (as hex)
        nonce = tx_dict.get('nonce') or getattr(tx, 'nonce', None)
        if nonce is not None:
            eip1559_tx['nonce'] = to_hex(nonce)
        
        # Chain ID (Base = 8453 = 0x2105, as hex)
        chain_id = tx_dict.get('chainId') or tx_dict.get('chain_id') or getattr(tx, 'chainId', 8453)
        eip1559_tx['chainId'] = to_hex(chain_id)
        
        # EIP-1559 gas pricing
        max_fee_per_gas = tx_dict.get('maxFeePerGas') or getattr(tx, 'maxFeePerGas', None)
        max_priority_fee_per_gas = tx_dict.get('maxPriorityFeePerGas') or getattr(tx, 'maxPriorityFeePerGas', None)
        
        if max_fee_per_gas or max_priority_fee_per_gas:
            if max_fee_per_gas:
                eip1559_tx['maxFeePerGas'] = to_hex(max_fee_per_gas)
            if max_priority_fee_per_gas:
                eip1559_tx['maxPriorityFeePerGas'] = to_hex(max_priority_fee_per_gas)
        else:
            # Fallback to legacy gasPrice if EIP-1559 fields not present
            gas_price = tx_dict.get('gasPrice') or getattr(tx, 'gasPrice', None)
            if gas_price:
                eip1559_tx['gasPrice'] = to_hex(gas_price)
        
        print(f"[TRADER] Converted transaction to EIP-1559 format: {eip1559_tx}")
        
        # Return transaction data along with metadata
        return {
            "transaction": eip1559_tx,
            "pair_index": pair_index,
            "trade_index": trade_index,
            "entry_price": current_price,
        }
    
    async def execute_signed_transaction(
        self,
        signed_transaction: str,
        pair_index: int,
        trade_index: int,
        entry_price: float
    ) -> TradeResult:
        """
        Execute a pre-signed transaction.
        
        Args:
            signed_transaction: The signed transaction (hex string or dict)
            pair_index: The pair index
            trade_index: The trade index
            entry_price: The entry price
            
        Returns:
            TradeResult with transaction details
        """
        self._ensure_initialized()
        
        try:
            print(f"[TRADER] Executing signed transaction...")
            
            # Execute the signed transaction
            # The signed_transaction can be a hex string or a dict
            if isinstance(signed_transaction, str):
                # If it's a hex string, we may need to parse it
                # For now, pass it directly to send_transaction
                receipt = await self.client.send_transaction(signed_transaction)
            else:
                # If it's a dict, pass it directly
                receipt = await self.client.send_transaction(signed_transaction)
            
            print(f"[TRADER] Transaction receipt: {receipt}")
            
            return TradeResult(
                success=True,
                tx_hash=receipt.transactionHash.hex() if hasattr(receipt, 'transactionHash') else str(receipt),
                entry_price=entry_price,
                pair_index=pair_index,
                trade_index=trade_index,
                message="Position opened successfully"
            )
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[TRADER] Error executing signed transaction: {str(e)}")
            print(f"[TRADER] Traceback: {error_trace}")
            return TradeResult(success=False, error=str(e))
    
    async def open_position(
        self,
        pair: str,
        side: PositionSide,
        collateral: float,
        leverage: Optional[int] = None,
        take_profit_percent: float = 200.0  # Default to 200%
    ) -> TradeResult:
        """
        Open a leveraged trading position using Privy for signing.
        
        Args:
            pair: Trading pair (e.g., 'ETH/USD')
            side: Position side (LONG or SHORT)
            collateral: Amount of USDC to use as collateral
            leverage: Leverage multiplier
            take_profit_percent: Take profit percentage (default 200%)
            
        Returns:
            TradeResult with transaction details
        """
        self._ensure_initialized()
        
        leverage = leverage or self.default_leverage
        
        try:
            # Parallelize network calls for better performance
            # Get pair index, current price, and open positions concurrently
            pair_index, current_price, existing_positions = await asyncio.gather(
                self.get_pair_index(pair),
                self.get_current_price(pair),
                self.get_open_positions()
            )
            
            # Calculate take profit price
            if side == PositionSide.LONG:
                take_profit = current_price * (1 + take_profit_percent / 100)
            else:
                take_profit = current_price * (1 - take_profit_percent / 100)
            
            # Determine trade index (for multiple positions on same pair)
            pair_positions = [
                t for t in existing_positions 
                if t.trade.pair_index == pair_index
            ]
            
            if pair_positions:
                trade_index = max(t.trade.trade_index for t in pair_positions) + 1
            else:
                trade_index = 0
            
            # Create trade input
            trade_input = TradeInput(
                trader=self.wallet_address,
                open_price=None,  # Will use current market price
                pair_index=pair_index,
                collateral_in_trade=collateral,
                is_long=side.value,
                leverage=leverage,
                index=trade_index,
                tp=take_profit,
                sl=0,  # No stop loss
                timestamp=0,
            )
            
            # Build transaction
            print(f"[TRADER] Building trade transaction for {pair}, side: {side}, collateral: {collateral}")
            tx = await self.client.trade.build_trade_open_tx(
                trade_input,
                TradeInputOrderType.MARKET,
                int(self.default_slippage)
            )
            print(f"[TRADER] Transaction built: {tx}")
            print(f"[TRADER] Transaction type: {type(tx)}")
            
            # Sign transaction using Privy
            # This is where we intercept and use Privy instead of local signing
            # Note: The actual implementation depends on how the Avantis SDK
            # structures transactions and how Privy expects them
            
            # Extract transaction data for Privy signing
            # The Avantis SDK may return a transaction object that needs to be converted
            # to a format Privy can understand (EIP-1559 format)
            print(f"[TRADER] Preparing transaction for Privy signing...")
            
            # Convert transaction to dict if it's not already
            if hasattr(tx, 'dict'):
                tx_dict = tx.dict()
            elif hasattr(tx, '__dict__'):
                tx_dict = tx.__dict__
            elif isinstance(tx, dict):
                tx_dict = tx
            else:
                # Try to serialize the transaction
                import json
                try:
                    tx_dict = json.loads(json.dumps(tx, default=str))
                except:
                    tx_dict = {"raw": str(tx)}
            
            print(f"[TRADER] Transaction dict: {tx_dict}")
            
            signed_tx_data = await self.privy_signer.sign_transaction(tx_dict)
            print(f"[TRADER] Transaction signed via Privy: {signed_tx_data}")
            
            # Execute transaction
            # Note: This may need to be adapted based on how Privy returns signed transactions
            # and how the SDK expects to send them
            print(f"[TRADER] Sending signed transaction to blockchain...")
            receipt = await self.client.send_transaction(signed_tx_data)
            print(f"[TRADER] Transaction receipt: {receipt}")
            
            return TradeResult(
                success=True,
                tx_hash=receipt.transactionHash.hex() if hasattr(receipt, 'transactionHash') else str(receipt),
                entry_price=current_price,
                pair_index=pair_index,
                trade_index=trade_index,
                message=f"Opened {'LONG' if side == PositionSide.LONG else 'SHORT'} position: {pair} | Collateral: ${collateral} | Leverage: {leverage}x"
            )
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[TRADER] Error opening position: {str(e)}")
            print(f"[TRADER] Traceback: {error_trace}")
            return TradeResult(success=False, error=str(e))
    
    async def close_position(
        self,
        pair_index: int,
        trade_index: int
    ) -> TradeResult:
        """
        Close an open position using Privy for signing.
        
        Args:
            pair_index: The pair index of the position
            trade_index: The trade index of the position
            
        Returns:
            TradeResult with transaction details
        """
        self._ensure_initialized()
        
        try:
            # Build close transaction
            tx = await self.client.trade.build_trade_close_tx(
                pair_index=pair_index,
                trade_index=trade_index,
                collateral_to_close=None,  # Close entire position
                trader=self.wallet_address
            )
            
            # Sign using Privy
            signed_tx_data = await self.privy_signer.sign_transaction(tx)
            
            # Execute
            receipt = await self.client.send_transaction(signed_tx_data)
            
            return TradeResult(
                success=True,
                tx_hash=receipt.transactionHash.hex() if hasattr(receipt, 'transactionHash') else str(receipt),
                message="Position closed successfully"
            )
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"[TRADER] Error closing position: {str(e)}")
            print(f"[TRADER] Traceback: {error_trace}")
            return TradeResult(success=False, error=str(e))
    
    async def close(self):
        """Close resources."""
        if self.privy_signer:
            await self.privy_signer.close()

