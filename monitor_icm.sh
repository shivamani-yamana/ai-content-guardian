#!/bin/bash

# Usage: ./monitor_icm.sh

echo "🔍 WarpGuard - ICM Monitoring Dashboard"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Updated network endpoints with correct URLs
APP_SUBNET_RPC="http://127.0.0.1:41243/ext/bc/S9KE4zarW96qo19RUj3ZWfoFKhetZgarjNnmJ6McAogjtRHVs/rpc"
SECURITY_SUBNET_RPC="http://127.0.0.1:39737/ext/bc/21FZHCQk1zyjTdw7rUfZJNs53QVvbB1t2k4rYwn23o66RcAcFo/rpc"
PRIMARY_RPC="http://127.0.0.1:9650/ext/bc/C/rpc"

# Updated contract addresses
CONTENT_CONTRACT="0x8B3BC4270BE2abbB25BC04717830bd1Cc493a461"
GUARDIAN_CONTRACT="0x8B3BC4270BE2abbB25BC04717830bd1Cc493a461"
ICM_REGISTRY="0x17aB05351fC94a1a67Bf3f56DdbB941aE6c63E25"

get_block_number() {
    local rpc_url=$1
    curl -s -X POST "$rpc_url" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        | jq -r '.result'
}

get_content_submissions() {
    echo -e "${BLUE}📝 Content Submissions (App Subnet):${NC}"
    local logs=$(curl -s -X POST "$APP_SUBNET_RPC" \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"method\": \"eth_getLogs\",
            \"params\": [{
                \"address\": \"$CONTENT_CONTRACT\",
                \"fromBlock\": \"0x0\",
                \"toBlock\": \"latest\"
            }],
            \"id\": 1
        }" | jq '.result | length')
    echo "   Total Submissions: $logs"
}

get_security_flags() {
    echo -e "${RED}🚨 Security Flags (Security Subnet):${NC}"
    local logs=$(curl -s -X POST "$SECURITY_SUBNET_RPC" \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"method\": \"eth_getLogs\",
            \"params\": [{
                \"address\": \"$GUARDIAN_CONTRACT\",
                \"fromBlock\": \"0x0\",
                \"toBlock\": \"latest\"
            }],
            \"id\": 1
        }" | jq '.result | length')
    echo "   Total Flags: $logs"
}

get_icm_registrations() {
    echo -e "${GREEN}⚡ ICM Registrations (Primary Network):${NC}"
    local logs=$(curl -s -X POST "$PRIMARY_RPC" \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"method\": \"eth_getLogs\",
            \"params\": [{
                \"address\": \"$ICM_REGISTRY\",
                \"fromBlock\": \"0x0\",
                \"toBlock\": \"latest\"
            }],
            \"id\": 1
        }" | jq '.result | length')
    echo "   Total ICM Events: $logs"
}

test_connections() {
    echo -e "${YELLOW}🔌 Testing Connections:${NC}"
    
    # Test App Subnet
    local app_response=$(curl -s -w "%{http_code}" -X POST "$APP_SUBNET_RPC" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}')
    if [[ "$app_response" == *"200" ]]; then
        echo "   ✅ App Subnet: Connected"
    else
        echo "   ❌ App Subnet: Failed"
    fi
    
    # Test Security Subnet
    local security_response=$(curl -s -w "%{http_code}" -X POST "$SECURITY_SUBNET_RPC" \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}')
    if [[ "$security_response" == *"200" ]]; then
        echo "   ✅ Security Subnet: Connected"
    else
        echo "   ❌ Security Subnet: Failed"
    fi
    
    # Test Oracle
    local oracle_response=$(curl -s -w "%{http_code}" "http://localhost:5000/")
    if [[ "$oracle_response" == *"200" ]]; then
        echo "   ✅ Oracle Service: Running"
    else
        echo "   ❌ Oracle Service: Offline"
    fi
}

monitor_live() {
    while true; do
        clear
        echo "🔍 WarpGuard - Live ICM Monitoring"
        echo "============================================="
        echo "$(date)"
        echo ""
        
        # Test connections first
        test_connections
        echo ""
        
        # Network status
        echo -e "${YELLOW}📊 Network Status:${NC}"
        local app_block=$(get_block_number "$APP_SUBNET_RPC")
        local security_block=$(get_block_number "$SECURITY_SUBNET_RPC")
        local primary_block=$(get_block_number "$PRIMARY_RPC")
        
        echo "   App Subnet Block: ${app_block:-'❌ Failed'}"
        echo "   Security Subnet Block: ${security_block:-'❌ Failed'}"
        echo "   Primary Network Block: ${primary_block:-'❌ Failed'}"
        echo ""
        
        # Content submissions
        get_content_submissions
        echo ""
        
        # Security flags
        get_security_flags
        echo ""
        
        # ICM registrations
        get_icm_registrations
        echo ""
        
        echo "Press Ctrl+C to stop monitoring..."
        sleep 5
    done
}

# Check if live monitoring is requested
if [ "$1" = "live" ]; then
    monitor_live
else
    echo ""
    test_connections
    echo ""
    
    echo -e "${YELLOW}📊 Current Network Status:${NC}"
    avalanche network status
    echo ""
    
    get_content_submissions
    echo ""
    get_security_flags
    echo ""
    get_icm_registrations
    echo ""
    
    echo "Run './monitor_icm.sh live' for continuous monitoring"
fi