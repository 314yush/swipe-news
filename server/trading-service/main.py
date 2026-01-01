"""
FastAPI service for executing trades via Privy
"""

from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
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


class ExecuteTradeRequest(BaseModel):
    privy_user_id: str
    wallet_address: str
    market_pair: str
    direction: str  # 'long' or 'short'
    collateral: float
    leverage: int = 75
    take_profit_percent: float = 100.0
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
    take_profit_percent: float = 100.0


class CloseTradeRequest(BaseModel):
    privy_user_id: str
    wallet_address: str
    pair_index: int
    trade_index: int


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


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "network": "Base", "rpc_url": RPC_URL}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

