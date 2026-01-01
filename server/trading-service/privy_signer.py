"""
Privy Signer for Avantis Trading SDK
Uses Privy's server-side API to sign transactions
"""

import os
from typing import Optional, Dict, Any
import httpx
from avantis_trader_sdk import TraderClient


class PrivySigner:
    """
    Signer that uses Privy's server-side API to sign transactions.
    The private key never leaves Privy's secure environment.
    """
    
    def __init__(self, privy_user_id: str, wallet_address: str):
        """
        Initialize Privy signer.
        
        Args:
            privy_user_id: Privy user ID
            wallet_address: Wallet address (embedded wallet)
        """
        self.privy_user_id = privy_user_id
        self.wallet_address = wallet_address
        
        # Privy API configuration
        self.privy_app_id = os.getenv('PRIVY_APP_ID')
        self.privy_app_secret = os.getenv('PRIVY_APP_SECRET')
        self.privy_api_url = os.getenv('PRIVY_API_URL', 'https://api.privy.io')
        
        if not self.privy_app_id or not self.privy_app_secret:
            raise ValueError("PRIVY_APP_ID and PRIVY_APP_SECRET must be set")
        
        self.http_client = httpx.AsyncClient()
    
    async def sign_transaction(self, transaction_data: Dict[str, Any]) -> str:
        """
        Sign a transaction using Privy's API.
        
        Args:
            transaction_data: Transaction data to sign (dict with transaction fields)
            
        Returns:
            Signed transaction hash or signed transaction data
        """
        # Use Privy's server-side signing API
        # This will sign the transaction using the user's embedded wallet
        # The private key never leaves Privy's secure environment
        
        # Log the transaction data for debugging
        print(f"[PRIVY_SIGNER] Attempting to sign transaction for user {self.privy_user_id}")
        print(f"[PRIVY_SIGNER] Wallet address: {self.wallet_address}")
        print(f"[PRIVY_SIGNER] Transaction data type: {type(transaction_data)}")
        print(f"[PRIVY_SIGNER] Transaction data: {transaction_data}")
        
        # Note: The actual API endpoint and format may vary based on Privy's API
        # Privy's server-side API typically uses:
        # POST /api/v1/apps/{app_id}/users/{user_id}/wallets/{wallet_address}/sign
        # With Authorization header: Bearer {app_secret}
        
        try:
            # For embedded wallets, Privy requires client-side signing (user popup)
            # However, we can try server-side signing using the RPC endpoint
            # Note: This may not work for embedded wallets - they typically require user interaction
            
            # Try to get wallet ID using Basic auth (app_id:app_secret)
            import base64
            auth_string = f"{self.privy_app_id}:{self.privy_app_secret}"
            auth_bytes = auth_string.encode('ascii')
            auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
            
            # IMPORTANT: For embedded wallets, Privy requires CLIENT-SIDE signing
            # Server-side signing doesn't work for embedded wallets because they require user interaction
            # 
            # The user should see a popup to approve the transaction in their browser.
            # This is the correct and secure behavior for embedded wallets.
            #
            # To implement this, you need to:
            # 1. Sign the transaction in the frontend using Privy's useSignTransaction hook
            # 2. Send the signed transaction to the backend
            # 3. Backend executes the signed transaction
            #
            # For now, we'll try to use the wallet address directly, but this likely won't work
            # and you'll need to switch to client-side signing.
            
            print(f"[PRIVY_SIGNER] Note: Embedded wallets require client-side signing (user popup)")
            print(f"[PRIVY_SIGNER] Attempting server-side signing (may not work for embedded wallets)...")
            
            # Try using wallet address as wallet_id (this may not work)
            # For embedded wallets, you typically need the actual wallet ID from Privy
            # which requires fetching it via API or storing it in your database
            wallet_id = self.wallet_address
            print(f"[PRIVY_SIGNER] Using wallet address as wallet_id: {wallet_id}")
            print(f"[PRIVY_SIGNER] If this fails, switch to client-side signing (see CLIENT_SIDE_SIGNING_GUIDE.md)")
            
            # Use Privy's RPC endpoint format for signing transactions
            # Based on: https://docs.privy.io/wallets/using-wallets/ethereum/sign-a-message
            # For transactions, use: POST /v1/wallets/{wallet_id}/rpc
            # With method: eth_sendTransaction (signs and sends) or eth_signTransaction (just signs)
            url = f"{self.privy_api_url}/v1/wallets/{wallet_id}/rpc"
            print(f"[PRIVY_SIGNER] Calling Privy RPC API: {url}")
            print(f"[PRIVY_SIGNER] Privy App ID: {self.privy_app_id}")
            print(f"[PRIVY_SIGNER] Privy User ID: {self.privy_user_id}")
            print(f"[PRIVY_SIGNER] Wallet ID: {wallet_id}")
            print(f"[PRIVY_SIGNER] Wallet Address: {self.wallet_address}")
            
            # Convert transaction to the format Privy expects
            # Privy RPC endpoint expects:
            # {
            #   "chain_type": "ethereum",
            #   "method": "eth_sendTransaction" or "eth_signTransaction",
            #   "params": {
            #     "to": contract address,
            #     "value": amount in hex (wei),
            #     "data": encoded function call (hex),
            #     "gas": gas limit (hex),
            #     "gasPrice" or "maxFeePerGas"/"maxPriorityFeePerGas" for EIP-1559,
            #     "nonce": transaction nonce (hex),
            #     "chainId": chain ID (hex, 0x2105 for Base)
            #   }
            # }
            
            # Extract transaction fields
            tx_to = transaction_data.get("to") or transaction_data.get("to_address")
            tx_value = transaction_data.get("value") or transaction_data.get("amount") or "0x0"
            tx_data = transaction_data.get("data") or transaction_data.get("input") or transaction_data.get("callData")
            tx_gas = transaction_data.get("gas") or transaction_data.get("gasLimit")
            tx_nonce = transaction_data.get("nonce")
            tx_chain_id = transaction_data.get("chainId") or transaction_data.get("chain_id") or 8453  # Base mainnet
            
            # Convert to hex if needed
            def to_hex(value):
                if value is None:
                    return None
                if isinstance(value, str):
                    if value.startswith("0x"):
                        return value
                    try:
                        return hex(int(value))
                    except:
                        return value
                if isinstance(value, int):
                    return hex(value)
                return str(value)
            
            # Build RPC params
            rpc_params = {}
            if tx_to:
                rpc_params["to"] = tx_to if tx_to.startswith("0x") else f"0x{tx_to}"
            if tx_value:
                rpc_params["value"] = to_hex(tx_value)
            if tx_data:
                rpc_params["data"] = tx_data if tx_data.startswith("0x") else f"0x{tx_data}"
            if tx_gas:
                rpc_params["gas"] = to_hex(tx_gas)
            if tx_nonce is not None:
                rpc_params["nonce"] = to_hex(tx_nonce)
            
            # Add gas pricing (EIP-1559 if available, else legacy)
            if "maxFeePerGas" in transaction_data or "maxPriorityFeePerGas" in transaction_data:
                rpc_params["maxFeePerGas"] = to_hex(transaction_data.get("maxFeePerGas"))
                rpc_params["maxPriorityFeePerGas"] = to_hex(transaction_data.get("maxPriorityFeePerGas"))
            elif "gasPrice" in transaction_data:
                rpc_params["gasPrice"] = to_hex(transaction_data.get("gasPrice"))
            
            # Add chainId
            rpc_params["chainId"] = to_hex(tx_chain_id)
            
            # Build RPC payload
            payload = {
                "chain_type": "ethereum",
                "method": "eth_sendTransaction",  # This signs and sends the transaction
                "params": rpc_params
            }
            
            print(f"[PRIVY_SIGNER] RPC request payload: {payload}")
            
            # Use basic auth with app_id:app_secret
            import base64
            auth_string = f"{self.privy_app_id}:{self.privy_app_secret}"
            auth_bytes = auth_string.encode('ascii')
            auth_b64 = base64.b64encode(auth_bytes).decode('ascii')
            
            response = await self.http_client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"Basic {auth_b64}",
                    "Content-Type": "application/json",
                    "privy-app-id": self.privy_app_id,
                },
                timeout=30.0,
            )
            
            print(f"[PRIVY_SIGNER] Response status: {response.status_code}")
            print(f"[PRIVY_SIGNER] Response headers: {dict(response.headers)}")
            
            response.raise_for_status()
            result = response.json()
            print(f"[PRIVY_SIGNER] Response data: {result}")
            
            # Privy RPC response format:
            # {
            #   "method": "eth_sendTransaction",
            #   "data": {
            #     "transactionHash": "0x..."  // The transaction hash
            #   }
            # }
            # For eth_signTransaction, it would return the signed transaction data
            
            # Extract transaction hash or signed transaction
            if isinstance(result, dict):
                data = result.get("data") or result
                if isinstance(data, dict):
                    # If eth_sendTransaction, return the transaction hash
                    tx_hash = data.get("transactionHash") or data.get("hash")
                    if tx_hash:
                        print(f"[PRIVY_SIGNER] Transaction hash: {tx_hash}")
                        return tx_hash
                    # If eth_signTransaction, return the signed transaction
                    signed_tx = data.get("rawTransaction") or data.get("signedTransaction") or data
                    if signed_tx:
                        print(f"[PRIVY_SIGNER] Signed transaction: {signed_tx}")
                        return signed_tx
                # Fallback: return the whole result
                print(f"[PRIVY_SIGNER] Returning full result: {result}")
                return result
            else:
                print(f"[PRIVY_SIGNER] Returning result as-is: {result}")
                return result
            
        except httpx.HTTPStatusError as e:
            error_detail = f"HTTP {e.response.status_code}: {e.response.text}"
            print(f"[PRIVY_SIGNER] HTTP Error: {error_detail}")
            raise Exception(f"Failed to sign transaction via Privy: {error_detail}")
        except httpx.HTTPError as e:
            error_detail = str(e)
            print(f"[PRIVY_SIGNER] HTTP Error: {error_detail}")
            raise Exception(f"Failed to sign transaction via Privy: {error_detail}")
        except Exception as e:
            error_detail = str(e)
            print(f"[PRIVY_SIGNER] Unexpected error: {error_detail}")
            raise Exception(f"Failed to sign transaction via Privy: {error_detail}")
    
    def get_ethereum_address(self) -> str:
        """Get the wallet address."""
        return self.wallet_address
    
    async def close(self):
        """Close the HTTP client."""
        await self.http_client.aclose()


class PrivyTraderClient:
    """
    Wrapper around TraderClient that uses Privy for signing.
    """
    
    def __init__(self, rpc_url: str, privy_user_id: str, wallet_address: str):
        self.client = TraderClient(rpc_url)
        self.privy_signer = PrivySigner(privy_user_id, wallet_address)
        
        # Note: The Avantis SDK expects a local signer, but we're using Privy
        # We'll need to intercept signing calls and route them through Privy
        # This may require SDK modifications or a custom signer adapter
    
    async def sign_and_send(self, transaction):
        """
        Sign transaction using Privy and send it.
        This is a placeholder - actual implementation depends on Privy SDK API.
        """
        # Build unsigned transaction
        unsigned_tx = transaction
        
        # Sign via Privy
        signed_tx = await self.privy_signer.sign_transaction(unsigned_tx)
        
        # Send signed transaction
        # Implementation depends on how Privy returns signed transactions
        return signed_tx
    
    async def close(self):
        """Close resources."""
        await self.privy_signer.close()

