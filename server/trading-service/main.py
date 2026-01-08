"""
FastAPI service for executing trades via Privy
"""

from dotenv import load_dotenv
import os
import ssl

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

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import httpx
from trader_privy import AvantisTraderPrivy, PositionSide, TradeResult

app = FastAPI(title="SwipeTrader Trading Service")

# CORS middleware
# Allow origins from environment variable or default to all (for development)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*")
if ALLOWED_ORIGINS == "*":
    allowed_origins = ["*"]
else:
    # Split comma-separated origins
    allowed_origins = [origin.strip() for origin in ALLOWED_ORIGINS.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
RPC_URL = os.getenv("AVANTIS_RPC_URL", "https://mainnet.base.org")

# Pairs cache for reverse lookup (index -> pair name)
_pairs_cache: Dict[int, str] = {}
_pairs_cache_timestamp: float = 0
PAIRS_CACHE_TTL = 300  # 5 minutes


async def get_pairs_cache() -> Dict[int, str]:
    """
    Fetch and cache pairs data from Avantis API for reverse lookup.
    Returns a dict mapping pair_index -> pair_name (e.g., "BTC/USD")
    """
    global _pairs_cache, _pairs_cache_timestamp
    import time
    
    current_time = time.time()
    
    # Return cached data if still valid
    if _pairs_cache and (current_time - _pairs_cache_timestamp) < PAIRS_CACHE_TTL:
        return _pairs_cache
    
    try:
        print("[API] Fetching pairs data from Avantis API...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://socket-api-pub.avantisfi.com/socket-api/v1/data",
                headers={"Accept": "application/json"}
            )
            response.raise_for_status()
            data = response.json()
        
        # Build reverse lookup map: index -> "FROM/TO"
        pairs_map = {}
        pair_infos = data.get("data", {}).get("pairInfos", {})
        
        for index_str, pair_info in pair_infos.items():
            try:
                index = int(index_str)
                from_asset = pair_info.get("from", "")
                to_asset = pair_info.get("to", "")
                if from_asset and to_asset:
                    pair_name = f"{from_asset}/{to_asset}"
                    pairs_map[index] = pair_name
            except (ValueError, KeyError) as e:
                print(f"[API] Error processing pair {index_str}: {e}")
                continue
        
        _pairs_cache = pairs_map
        _pairs_cache_timestamp = current_time
        print(f"[API] ✅ Cached {len(pairs_map)} pairs for reverse lookup")
        return pairs_map
        
    except Exception as e:
        print(f"[API] ⚠️ Failed to fetch pairs data: {e}")
        # Return existing cache even if expired, or empty dict
        return _pairs_cache if _pairs_cache else {}


class ExecuteTradeRequest(BaseModel):
    privy_user_id: str
    wallet_address: str
    market_pair: str
    direction: str  # 'long' or 'short'
    collateral: float
    leverage: int = 75
    take_profit_percent: float = 200.0  # Default to 200%
    signed_transaction: Optional[Any] = None  # NEW: Pre-signed transaction from frontend
    pair_index: Optional[int] = None  # NEW: Pair index from build-transaction
    trade_index: Optional[int] = None  # NEW: Trade index from build-transaction
    entry_price: Optional[float] = None  # NEW: Entry price from build-transaction


class BuildTransactionRequest(BaseModel):
    privy_user_id: str
    wallet_address: str
    market_pair: str
    direction: str  # 'long' or 'short'
    collateral: float
    leverage: int = 75
    take_profit_percent: float = 200.0  # Default to 200%


class CloseTradeRequest(BaseModel):
    privy_user_id: str
    wallet_address: str
    pair_index: int
    trade_index: int


class GetTradesRequest(BaseModel):
    privy_user_id: str
    wallet_address: str


class GetPricesRequest(BaseModel):
    markets: list[str]  # List of market pairs like ["BTC/USD", "ETH/USD"]


@app.post("/build-transaction")
async def build_transaction(request: BuildTransactionRequest):
    """
    Build an unsigned transaction for client-side signing.
    """
    print(f"[API] Received build-transaction request: {request}")
    trader = None
    try:
        # Use cached trader if available, otherwise create new one
        trader = await get_or_create_trader(
            request.privy_user_id,
            request.wallet_address,
            request.leverage
        )
        
        # Determine position side
        side = PositionSide.LONG if request.direction == 'long' else PositionSide.SHORT
        position_size = request.collateral * request.leverage
        
        print(f"[API] 📊 Trade Parameters:")
        print(f"[API]   Market: {request.market_pair}")
        print(f"[API]   Direction: {side.name}")
        print(f"[API]   Collateral: ${request.collateral}")
        print(f"[API]   Leverage: {request.leverage}x")
        print(f"[API]   Position Size: ${position_size}")
        
        # Build unsigned transaction
        print(f"[API] Building unsigned transaction...")
        tx_data = await trader.build_unsigned_transaction(
            pair=request.market_pair,
            side=side,
            collateral=request.collateral,
            leverage=request.leverage,
            take_profit_percent=request.take_profit_percent
        )
        
        print(f"[API] Transaction built successfully")
        
        response = {
            "success": True,
            "transaction": tx_data["transaction"],
            "pair_index": tx_data["pair_index"],
            "trade_index": tx_data["trade_index"],
            "entry_price": tx_data["entry_price"],
        }
        print(f"[API] Returning transaction data: {response}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[API] Error building transaction: {str(e)}")
        print(f"[API] Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=str(e))
    # Note: Don't close cached traders - they're reused for subsequent requests


# Simple trader cache to reuse trader instances
# Key: (privy_user_id, wallet_address), Value: AvantisTraderPrivy instance
# Note: In production, consider adding TTL and cleanup for cached traders
_trader_cache: dict = {}

async def get_or_create_trader(privy_user_id: str, wallet_address: str, leverage: int):
    """Get or create a cached trader instance."""
    cache_key = (privy_user_id, wallet_address)
    if cache_key not in _trader_cache:
        trader = AvantisTraderPrivy(
            rpc_url=RPC_URL,
            privy_user_id=privy_user_id,
            wallet_address=wallet_address,
            default_leverage=leverage
        )
        await trader.initialize()
        _trader_cache[cache_key] = trader
        print(f"[API] Created new trader instance and cached it: {cache_key}")
    else:
        print(f"[API] Reusing cached trader instance: {cache_key}")
    return _trader_cache[cache_key]

async def cleanup_trader_cache():
    """Cleanup cached traders (call periodically or on shutdown)."""
    for trader in _trader_cache.values():
        try:
            await trader.close()
        except:
            pass
    _trader_cache.clear()

@app.post("/execute-trade")
async def execute_trade(request: ExecuteTradeRequest):
    """
    Execute a trade. If signed_transaction is provided, execute it directly.
    Otherwise, build and sign the transaction server-side (legacy mode).
    """
    print(f"[API] Received execute-trade request: {request}")
    trader = None
    try:
        # Use cached trader if available, otherwise create new one
        trader = await get_or_create_trader(
            request.privy_user_id,
            request.wallet_address,
            request.leverage
        )
        
        # If signed transaction is provided, execute it directly (client-side signing)
        if request.signed_transaction:
            print(f"[API] Executing pre-signed transaction (client-side signing mode)")
            import json
            signed_tx = request.signed_transaction
            if isinstance(signed_tx, str):
                try:
                    signed_tx = json.loads(signed_tx)
                except:
                    pass  # Keep as string if not JSON
            
            # Use metadata from request if provided, otherwise calculate
            if request.pair_index is not None and request.trade_index is not None and request.entry_price is not None:
                # Skip trader initialization if we have all metadata - just use execute_signed_transaction
                # This avoids redundant initialization and network calls
                print(f"[API] Using provided metadata, skipping redundant calculations")
                pair_index = request.pair_index
                trade_index = request.trade_index
                entry_price = request.entry_price
                
                # Only initialize trader if not already initialized (for execute_signed_transaction)
                if not trader._initialized:
                    print(f"[API] Trader not initialized, initializing for execute_signed_transaction...")
                    await trader.initialize()
                
                result = await trader.execute_signed_transaction(
                    signed_transaction=signed_tx,
                    pair_index=pair_index,
                    trade_index=trade_index,
                    entry_price=entry_price
                )
            else:
                # Fallback: calculate from request (requires full initialization)
                print(f"[API] Metadata not provided, calculating from request...")
                await trader.initialize()
                side = PositionSide.LONG if request.direction == 'long' else PositionSide.SHORT
                pair_index = await trader.get_pair_index(request.market_pair)
                
                # Get trade index
                existing_positions = await trader.get_open_positions()
                pair_positions = [
                    t for t in existing_positions 
                    if t.trade.pair_index == pair_index
                ]
                if pair_positions:
                    trade_index = max(t.trade.trade_index for t in pair_positions) + 1
                else:
                    trade_index = 0
                
                entry_price = await trader.get_current_price(request.market_pair)
                
                result = await trader.execute_signed_transaction(
                    signed_transaction=signed_tx,
                    pair_index=pair_index,
                    trade_index=trade_index,
                    entry_price=entry_price
                )
        else:
            # Legacy mode: build and sign server-side
            print(f"[API] Using legacy server-side signing mode")
            side = PositionSide.LONG if request.direction == 'long' else PositionSide.SHORT
            print(f"[API] Position side: {side}")
            
            # Execute trade
            print(f"[API] Opening position: {request.market_pair}, {side}, collateral={request.collateral}")
            result = await trader.open_position(
                pair=request.market_pair,
                side=side,
                collateral=request.collateral,
                leverage=request.leverage,
                take_profit_percent=request.take_profit_percent
            )
        
        print(f"[API] 📊 Trade Execution Result:")
        print(f"[API]   Success: {result.success}")
        if result.success:
            print(f"[API]   TX Hash: {result.tx_hash}")
            print(f"[API]   Entry Price: {result.entry_price}")
            print(f"[API]   Pair Index: {result.pair_index}")
            print(f"[API]   Trade Index: {result.trade_index}")
        else:
            print(f"[API]   Error: {result.error}")
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error or "Trade execution failed")
        
        response = {
            "success": True,
            "trade_id": result.tx_hash,  # Using tx_hash as trade_id
            "entry_price": result.entry_price,
            "tx_hash": result.tx_hash,
            "pair_index": result.pair_index,
            "trade_index": result.trade_index,
            "message": result.message
        }
        print(f"[API] Returning success response: {response}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[API] Error executing trade: {str(e)}")
        print(f"[API] Traceback: {error_trace}")
        # Remove trader from cache on error to force re-initialization
        cache_key = (request.privy_user_id, request.wallet_address)
        if cache_key in _trader_cache:
            try:
                await _trader_cache[cache_key].close()
            except:
                pass
            del _trader_cache[cache_key]
            print(f"[API] Removed trader from cache due to error: {cache_key}")
        raise HTTPException(status_code=500, detail=str(e))
    # Note: Don't close cached traders - they're reused for subsequent requests


@app.post("/close-trade")
async def close_trade(request: CloseTradeRequest):
    """
    Close a position using Privy for signing.
    """
    trader = None
    try:
        # Initialize trader
        trader = AvantisTraderPrivy(
            rpc_url=RPC_URL,
            privy_user_id=request.privy_user_id,
            wallet_address=request.wallet_address
        )
        
        await trader.initialize()
        
        # Close position
        result = await trader.close_position(
            pair_index=request.pair_index,
            trade_index=request.trade_index
        )
        
        if not result.success:
            raise HTTPException(status_code=400, detail=result.error or "Failed to close position")
        
        return {
            "success": True,
            "tx_hash": result.tx_hash,
            "message": result.message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if trader:
            await trader.close()


@app.post("/get-trades")
async def get_trades(request: GetTradesRequest):
    """
    Get all trades (active and closed) from Avantis SDK.
    Uses client.trade.get_trades() which returns (trades, pending_orders) tuple.
    """
    print(f"[API] Received get-trades request: {request}")
    trader = None
    try:
        # Use cached trader if available, otherwise create new one
        trader = await get_or_create_trader(
            request.privy_user_id,
            request.wallet_address,
            75  # Default leverage for fetching trades
        )
        
        # Get trades from Avantis SDK (same method used in get_open_positions)
        print(f"[API] Fetching trades from Avantis SDK for wallet: {request.wallet_address}")
        trades, pending_orders = await trader.client.trade.get_trades(request.wallet_address)
        
        print(f"[API] Found {len(trades)} trades and {len(pending_orders)} pending orders")
        
        # DEBUG: Log trade object structure to understand what we're getting
        if trades:
            first_trade_obj = trades[0]
            print(f"[API] === FIRST TRADE OBJECT DEBUG ===")
            print(f"[API] Type: {type(first_trade_obj)}")
            if hasattr(first_trade_obj, 'trade'):
                trade = first_trade_obj.trade
                print(f"[API] Trade object type: {type(trade)}")
                print(f"[API] Trade attributes: {[attr for attr in dir(trade) if not attr.startswith('_')]}")
                print(f"[API] Trade __dict__: {trade.__dict__ if hasattr(trade, '__dict__') else 'N/A'}")
                # Check for closed trade indicators
                print(f"[API] Has close_price: {hasattr(trade, 'close_price')}, value: {getattr(trade, 'close_price', None)}")
                print(f"[API] Has exit_price: {hasattr(trade, 'exit_price')}, value: {getattr(trade, 'exit_price', None)}")
                print(f"[API] Has is_closed: {hasattr(trade, 'is_closed')}, value: {getattr(trade, 'is_closed', None)}")
                print(f"[API] Has status: {hasattr(trade, 'status')}, value: {getattr(trade, 'status', None)}")
                print(f"[API] Has collateral_in_trade: {hasattr(trade, 'collateral_in_trade')}, value: {getattr(trade, 'collateral_in_trade', None)}")
                print(f"[API] Has open_collateral: {hasattr(trade, 'open_collateral')}, value: {getattr(trade, 'open_collateral', None)}")
            print(f"[API] === END FIRST TRADE DEBUG ===")
        
        # Format trades for client consumption
        # Each trade object has: trade.pair_index, trade.trade_index, trade.is_long, etc.
        formatted_trades = []
        for trade_obj in trades:
            try:
                # Handle different trade object structures
                # The trade might be directly in trade_obj or in trade_obj.trade
                if hasattr(trade_obj, 'trade'):
                    trade = trade_obj.trade  # Access the trade data
                else:
                    trade = trade_obj  # Trade data is directly in trade_obj
                
                # Debug: log trade object structure (only first trade to avoid spam)
                if len(formatted_trades) == 0:
                    print(f"[API] ===== TRADE OBJECT DEBUG =====")
                    print(f"[API] trade_obj type: {type(trade_obj)}")
                    print(f"[API] trade_obj attributes: {[attr for attr in dir(trade_obj) if not attr.startswith('_')]}")
                    if hasattr(trade_obj, '__dict__'):
                        print(f"[API] trade_obj __dict__: {trade_obj.__dict__}")
                    print(f"[API] trade type: {type(trade)}")
                    print(f"[API] trade attributes: {[attr for attr in dir(trade) if not attr.startswith('_')]}")
                    # Try to print the trade object as dict if possible
                    if hasattr(trade, '__dict__'):
                        print(f"[API] trade __dict__: {trade.__dict__}")
                    elif isinstance(trade, dict):
                        print(f"[API] trade (dict): {trade}")
                    # Try to access pair_index directly to see what happens
                    try:
                        direct_pair = trade.pair_index
                        print(f"[API] Direct access trade.pair_index: {direct_pair}")
                    except AttributeError as e:
                        print(f"[API] Direct access failed: {e}")
                    try:
                        direct_trade = trade.trade_index
                        print(f"[API] Direct access trade.trade_index: {direct_trade}")
                    except AttributeError as e:
                        print(f"[API] Direct access failed: {e}")
                    print(f"[API] ===== END DEBUG =====")
                
                # Extract pair_index - try multiple attribute names and formats
                pair_index = None
                trade_index = None
                
                # DEBUG: Log what we're working with
                if len(formatted_trades) == 0:  # Only for first trade to avoid spam
                    print(f"[API] === EXTRACTION DEBUG ===")
                    print(f"[API] trade type: {type(trade)}")
                    print(f"[API] has __dict__: {hasattr(trade, '__dict__')}")
                    if hasattr(trade, '__dict__'):
                        print(f"[API] trade.__dict__ keys: {list(trade.__dict__.keys())}")
                        print(f"[API] trade.__dict__['pair_index']: {trade.__dict__.get('pair_index')}")
                        print(f"[API] trade.__dict__['trade_index']: {trade.__dict__.get('trade_index')}")
                
                # Direct attribute access first (most reliable for Pydantic models)
                pair_index = getattr(trade, 'pair_index', None)
                trade_index = getattr(trade, 'trade_index', None)
                
                # DEBUG: Log direct access result
                if len(formatted_trades) == 0:
                    print(f"[API] Direct getattr result: pair_index={pair_index}, trade_index={trade_index}")
                
                # If direct access didn't work, try dict access
                if pair_index is None or trade_index is None:
                    # Try to convert dataclass/Pydantic to dict if possible
                    trade_dict = None
                    if hasattr(trade, '__dict__'):
                        trade_dict = trade.__dict__
                    elif hasattr(trade, 'dict'):  # Pydantic model
                        try:
                            trade_dict = trade.dict()
                        except:
                            pass
                    elif hasattr(trade, '_asdict'):  # Named tuple
                        try:
                            trade_dict = trade._asdict()
                        except:
                            pass
                    elif isinstance(trade, dict):
                        trade_dict = trade
                    
                    # Try different ways to access pair_index
                    # IMPORTANT: Use explicit None checks, not 'or', because 0 is a valid index!
                    if trade_dict:
                        if pair_index is None:
                            pair_index = trade_dict.get('pair_index')
                            if pair_index is None:
                                pair_index = trade_dict.get('pairIndex')
                        if trade_index is None:
                            trade_index = trade_dict.get('trade_index')
                            if trade_index is None:
                                trade_index = trade_dict.get('tradeIndex')
                    
                    # Try camelCase if snake_case didn't work
                    if pair_index is None:
                        pair_index = getattr(trade, 'pairIndex', None)
                    if trade_index is None:
                        trade_index = getattr(trade, 'tradeIndex', None)
                    
                    # Try accessing as dict-like if it has __getitem__
                    if pair_index is None and hasattr(trade, '__getitem__'):
                        try:
                            pair_index = trade.get('pair_index') if hasattr(trade, 'get') else trade['pair_index']
                        except (KeyError, TypeError):
                            pass
                        try:
                            trade_index = trade.get('trade_index') if hasattr(trade, 'get') else trade['trade_index']
                        except (KeyError, TypeError):
                            pass
                
                # DEBUG: Log final extraction result
                if len(formatted_trades) == 0:
                    print(f"[API] Final extraction: pair_index={pair_index} (type: {type(pair_index)}), trade_index={trade_index} (type: {type(trade_index)})")
                    print(f"[API] === END EXTRACTION DEBUG ===")
                
                # Convert to int if found
                if pair_index is not None:
                    try:
                        pair_index = int(pair_index)
                    except (ValueError, TypeError):
                        print(f"[API] ⚠️ pair_index is not a valid integer: {pair_index}")
                        pair_index = None
                
                if trade_index is not None:
                    try:
                        trade_index = int(trade_index)
                    except (ValueError, TypeError):
                        print(f"[API] ⚠️ trade_index is not a valid integer: {trade_index}")
                        trade_index = None
                
                # Log if we couldn't find the indices
                if pair_index is None or trade_index is None:
                    print(f"[API] ⚠️ Trade missing indices - pair_index: {pair_index}, trade_index: {trade_index}")
                    print(f"[API] Trade object type: {type(trade)}")
                    if hasattr(trade, '__dict__'):
                        print(f"[API] Available attributes: {list(trade.__dict__.keys())}")
                    elif isinstance(trade, dict):
                        print(f"[API] Available keys: {list(trade.keys())}")
                    else:
                        print(f"[API] Available attributes: {[attr for attr in dir(trade) if not attr.startswith('_')]}")
                
                # Get pair name from pairs cache (reverse lookup: index -> name)
                pair_name = None
                if pair_index is not None:
                    pairs_map = await get_pairs_cache()
                    pair_name = pairs_map.get(pair_index)
                    if not pair_name:
                        print(f"[API] ⚠️ Could not resolve pair name for index {pair_index}")
                
                # Check if trade is closed by looking for close_price, exit_price, or is_closed field
                # Also check if collateral_in_trade is 0 (indicates closed position)
                is_closed = False
                exit_price = None
                close_time = None
                
                # Get collateral to check if position is closed
                collateral_in_trade = float(getattr(trade, 'collateral_in_trade', 0)) if hasattr(trade, 'collateral_in_trade') and getattr(trade, 'collateral_in_trade', None) is not None else None
                open_collateral = float(getattr(trade, 'open_collateral', 0)) if hasattr(trade, 'open_collateral') and getattr(trade, 'open_collateral', None) is not None else None
                
                # Try different field names that might indicate a closed trade
                if hasattr(trade, 'close_price') and getattr(trade, 'close_price', None) is not None:
                    is_closed = True
                    exit_price = float(getattr(trade, 'close_price', 0))
                elif hasattr(trade, 'exit_price') and getattr(trade, 'exit_price', None) is not None:
                    is_closed = True
                    exit_price = float(getattr(trade, 'exit_price', 0))
                elif hasattr(trade, 'is_closed'):
                    is_closed = bool(getattr(trade, 'is_closed', False))
                elif hasattr(trade, 'status'):
                    trade_status = str(getattr(trade, 'status', '')).lower()
                    is_closed = trade_status in ['closed', 'liquidated', 'settled']
                # Check if collateral is 0 (closed position)
                elif collateral_in_trade is not None and collateral_in_trade == 0:
                    is_closed = True
                    print(f"[API] Trade detected as closed: collateral_in_trade is 0")
                elif open_collateral is not None and open_collateral == 0:
                    is_closed = True
                    print(f"[API] Trade detected as closed: open_collateral is 0")
                
                # Try to get close time
                close_time = None
                if hasattr(trade, 'close_time') and getattr(trade, 'close_time', None) is not None:
                    close_time_value = getattr(trade, 'close_time')
                    # Convert Unix timestamp to datetime if needed
                    if isinstance(close_time_value, (int, float)) and close_time_value > 0:
                        from datetime import datetime
                        close_time = datetime.fromtimestamp(close_time_value)
                    elif hasattr(close_time_value, 'isoformat'):
                        close_time = close_time_value
                    else:
                        close_time = close_time_value
                elif hasattr(trade, 'closed_at') and getattr(trade, 'closed_at', None) is not None:
                    closed_at_value = getattr(trade, 'closed_at')
                    # Convert Unix timestamp to datetime if needed
                    if isinstance(closed_at_value, (int, float)) and closed_at_value > 0:
                        from datetime import datetime
                        close_time = datetime.fromtimestamp(closed_at_value)
                    else:
                        close_time = closed_at_value
                
                # Get entry price
                entry_price = float(getattr(trade, 'open_price', 0)) if hasattr(trade, 'open_price') and getattr(trade, 'open_price', None) else 0.0
                
                # Try to get open time/timestamp
                # Avantis SDK returns Unix timestamp (integer) in the 'timestamp' field
                opened_at = None
                if hasattr(trade, 'timestamp') and getattr(trade, 'timestamp', None) is not None:
                    timestamp_value = getattr(trade, 'timestamp')
                    # Convert Unix timestamp to datetime
                    if isinstance(timestamp_value, (int, float)) and timestamp_value > 0:
                        from datetime import datetime
                        opened_at = datetime.fromtimestamp(timestamp_value)
                    elif hasattr(timestamp_value, 'isoformat'):
                        opened_at = timestamp_value
                    else:
                        opened_at = timestamp_value
                elif hasattr(trade, 'open_time') and getattr(trade, 'open_time', None) is not None:
                    opened_at = getattr(trade, 'open_time')
                elif hasattr(trade, 'opened_at') and getattr(trade, 'opened_at', None) is not None:
                    opened_at = getattr(trade, 'opened_at')
                elif hasattr(trade, 'created_at') and getattr(trade, 'created_at', None) is not None:
                    created_at = getattr(trade, 'created_at')
                    # Also check if it's a Unix timestamp
                    if isinstance(created_at, (int, float)) and created_at > 0:
                        from datetime import datetime
                        opened_at = datetime.fromtimestamp(created_at)
                    else:
                        opened_at = created_at
                
                # Calculate P&L for both active and closed trades
                # IMPORTANT: Use open_collateral (original collateral) not collateral_in_trade (current collateral)
                # collateral_in_trade changes as P&L accumulates, but P&L should be based on original position size
                pnl = 0.0
                pnl_percent = 0.0
                
                # Get original collateral (open_collateral) for P&L calculation
                open_collateral = float(getattr(trade, 'open_collateral', 0)) if hasattr(trade, 'open_collateral') and getattr(trade, 'open_collateral', None) is not None else 0.0
                leverage = int(getattr(trade, 'leverage', 75)) if hasattr(trade, 'leverage') else 75
                is_long = getattr(trade, 'is_long', True)
                
                # For active trades, calculate unrealized P&L using current price
                # For closed trades, use exit_price
                if not is_closed and entry_price > 0:
                    # Active trade - we'll calculate P&L on client side with current price
                    # But we can calculate it here if we have current price
                    pass  # Will be calculated on client with real-time prices
                elif is_closed and exit_price and entry_price > 0:
                    # Closed trade - calculate realized P&L
                    if is_long:
                        price_change = (exit_price - entry_price) / entry_price
                    else:
                        price_change = (entry_price - exit_price) / entry_price
                    
                    # Use open_collateral (original) for P&L calculation
                    pnl = open_collateral * leverage * price_change
                    pnl_percent = price_change * leverage * 100
                
                # Get market open status from pairs data
                market_is_open = True  # Default to open
                try:
                    # Fetch pairs data to check is_open status
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        response = await client.get(
                            "https://socket-api-pub.avantisfi.com/socket-api/v1/data",
                            headers={"Accept": "application/json"}
                        )
                        if response.status_code == 200:
                            data = response.json()
                            pair_infos = data.get("data", {}).get("pairInfos", {})
                            pair_index = getattr(trade, 'pair_index', None)
                            if pair_index is not None:
                                pair_info = pair_infos.get(str(pair_index))
                                if pair_info and pair_info.get("feed", {}).get("attributes", {}).get("is_open") is False:
                                    market_is_open = False
                except Exception as e:
                    print(f"[API] Could not check market status: {e}, defaulting to open")
                
                # Skip trade if we don't have required indices (needed for closing trades)
                # DEBUG: Log values right before the check
                if len(formatted_trades) == 0:
                    print(f"[API] === PRE-SKIP CHECK DEBUG ===")
                    print(f"[API] pair_index value: {pair_index} (type: {type(pair_index)}, is None: {pair_index is None})")
                    print(f"[API] trade_index value: {trade_index} (type: {type(trade_index)}, is None: {trade_index is None})")
                    print(f"[API] Will skip? {pair_index is None or trade_index is None}")
                    print(f"[API] === END PRE-SKIP CHECK ===")
                
                if pair_index is None or trade_index is None:
                    print(f"[API] ⚠️ Skipping trade - missing required indices (pair_index: {pair_index}, trade_index: {trade_index})")
                    continue
                
                # DEBUG: Log successful extraction
                if len(formatted_trades) == 0:
                    print(f"[API] ✅ Trade passed validation, will be added to formatted_trades")
                    print(f"[API] pair_index: {pair_index}, trade_index: {trade_index}")
                
                # Safely extract trade properties with fallbacks
                formatted_trades.append({
                    "pair_index": pair_index,
                    "trade_index": trade_index,
                    "direction": "long" if getattr(trade, 'is_long', True) else "short",
                    # Use open_collateral for display (original collateral amount)
                    # collateral_in_trade changes as P&L accumulates, but we want to show original
                    "collateral": float(getattr(trade, 'open_collateral', 0)) if hasattr(trade, 'open_collateral') and getattr(trade, 'open_collateral', None) is not None else (float(getattr(trade, 'collateral_in_trade', 0)) if hasattr(trade, 'collateral_in_trade') else 0.0),
                    "leverage": int(getattr(trade, 'leverage', 75)) if hasattr(trade, 'leverage') else 75,
                    "entry_price": entry_price,
                    "exit_price": exit_price,
                    "take_profit": float(getattr(trade, 'tp', None)) if hasattr(trade, 'tp') and getattr(trade, 'tp', None) else None,
                    "stop_loss": float(getattr(trade, 'sl', None)) if hasattr(trade, 'sl') and getattr(trade, 'sl', None) else None,
                    "status": "closed" if is_closed else "active",
                    "pair_name": pair_name,  # May be None if we can't resolve it
                    "pnl": pnl,
                    "pnl_percent": pnl_percent,
                    "opened_at": opened_at.isoformat() if opened_at and hasattr(opened_at, 'isoformat') else (str(opened_at) if opened_at else None),
                    "closed_at": close_time.isoformat() if close_time and hasattr(close_time, 'isoformat') else (str(close_time) if close_time else None),
                    "market_is_open": market_is_open,  # Market open status
                })
            except Exception as e:
                print(f"[API] Error formatting trade: {e}")
                print(f"[API] Trade object type: {type(trade_obj)}")
                import traceback
                print(f"[API] Traceback: {traceback.format_exc()}")
                # Skip this trade and continue with others
                continue
        
        # Separate active and closed trades
        active_trades = [t for t in formatted_trades if t.get("status") == "active"]
        closed_trades = [t for t in formatted_trades if t.get("status") == "closed"]
        
        print(f"[API] Formatted {len(formatted_trades)} trades: {len(active_trades)} active, {len(closed_trades)} closed")
        
        # DEBUG: Log details of each trade to understand what's being returned
        print(f"[API] === TRADE STATUS DEBUG ===")
        for i, trade in enumerate(formatted_trades):
            print(f"[API] Trade {i+1}: {trade.get('pair_name', 'Unknown')} - Status: {trade.get('status')}, "
                  f"Collateral: {trade.get('collateral')}, Exit Price: {trade.get('exit_price')}, "
                  f"Pair Index: {trade.get('pair_index')}, Trade Index: {trade.get('trade_index')}")
        print(f"[API] === END TRADE STATUS DEBUG ===")
        
        # Debug: Log first trade structure to verify pair_index/trade_index are included
        if formatted_trades:
            first_trade = formatted_trades[0]
            print(f"[API] First formatted trade structure:", {
                "pair_index": first_trade.get("pair_index"),
                "trade_index": first_trade.get("trade_index"),
                "pair_name": first_trade.get("pair_name"),
                "status": first_trade.get("status"),
                "has_pair_index": "pair_index" in first_trade,
                "has_trade_index": "trade_index" in first_trade,
                "pair_index_type": type(first_trade.get("pair_index")).__name__,
                "trade_index_type": type(first_trade.get("trade_index")).__name__,
            })
            # Also print the actual dict to see all keys
            print(f"[API] First trade keys: {list(first_trade.keys())}")
            print(f"[API] First trade full dict: {first_trade}")
        
        # Debug: Verify all trades have pair_index and trade_index
        missing_indices = []
        for i, t in enumerate(formatted_trades):
            if "pair_index" not in t or "trade_index" not in t:
                missing_indices.append(i)
            elif t.get("pair_index") is None or t.get("trade_index") is None:
                missing_indices.append(i)
        
        if missing_indices:
            print(f"[API] ⚠️ WARNING: {len(missing_indices)} trades missing indices: {missing_indices}")
        else:
            print(f"[API] ✅ All {len(formatted_trades)} trades have pair_index and trade_index")
        
        return {
            "success": True,
            "trades": formatted_trades,  # All trades
            "active_trades": active_trades,  # Only active trades
            "closed_trades": closed_trades,  # Only closed trades
            "pending_orders": len(pending_orders)  # Count of pending orders
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[API] Error fetching trades: {str(e)}")
        print(f"[API] Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=str(e))
    # Note: Don't close cached traders - they're reused for subsequent requests


@app.post("/get-prices")
async def get_prices(request: GetPricesRequest):
    """
    Get current prices for multiple markets from Avantis SDK.
    """
    print(f"[API] Received get-prices request for {len(request.markets)} markets")
    trader = None
    try:
        # Create a temporary trader just to access price feeds
        # We don't need user-specific data for price fetching
        trader = AvantisTraderPrivy(
            rpc_url=RPC_URL,
            privy_user_id="",  # Not needed for price fetching
            wallet_address="0x0000000000000000000000000000000000000000"  # Not needed for price fetching
        )
        
        await trader.initialize()
        
        # Get prices from Avantis SDK
        prices = {}
        for market in request.markets:
            try:
                current_price = await trader.get_current_price(market)
                prices[market] = current_price
                print(f"[API] Got price for {market}: {current_price}")
            except Exception as e:
                print(f"[API] Error getting price for {market}: {e}")
                # Continue with other markets even if one fails
                continue
        
        print(f"[API] Returning prices response: {len(prices)} markets")
        print(f"[API] Price keys: {list(prices.keys())}")
        
        return {
            "success": True,
            "prices": prices
        }
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[API] Error fetching prices: {str(e)}")
        print(f"[API] Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if trader:
            await trader.close()


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "network": "Base", "rpc_url": RPC_URL}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

