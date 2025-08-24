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

# Network endpoints
APP_SUBNET_RPC="http://127.0.0.1:44329/ext/bc/2HBRYnNjW2zaSTU9Yx7BNjP9EqNWXpF9r3BW1iNi8aMdYdfQYU/rpc"
SECURITY_SUBNET_RPC="http://127.0.0.1:41241/ext/bc/29sTJAdK61GMy6habcTqEHFj2GfQgnieGh8TSaWJgpwnNqYS4y/rpc"
PRIMARY_RPC="http://127.0.0.1:9650/ext/bc/C/rpc"

# Contract addresses
CONTENT_CONTRACT="0xCB5bf91D236ebe6eF6AE57342570884234bd11Cc"
GUARDIAN_CONTRACT="0x768AF58E63775354938e9F3FEdB764F601c038b4"
ICM_REGISTRY="0x17aB05351fC94a1a67Bf3f56DdbB941aE6c63E25"

get_block_number() {
    local rpc_url=$1
    curl -s -X POST $rpc_url \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        | jq -r '.result'
}

get_content_submissions() {
    echo -e "${BLUE}📝 Content Submissions (App Subnet):${NC}"
    local logs=$(curl -s -X POST $APP_SUBNET_RPC \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"method\": \"eth_getLogs\",
            \"params\": [{
                \"address\": \"$CONTENT_CONTRACT\",
                \"fromBlock\": \"0x0\",
                \"toBlock\": \"latest\",
                \"topics\": [\"0x682677900b65919925f3072e25a3ff46900b867336d37c52e673933b890500b7\"]
            }],
            \"id\": 1
        }" | jq '.result | length')
    echo "   Total Submissions: $logs"
}

get_security_flags() {
    echo -e "${RED}🚨 Security Flags (Security Subnet):${NC}"
    local logs=$(curl -s -X POST $SECURITY_SUBNET_RPC \
        -H "Content-Type: application/json" \
        -d "{
            \"jsonrpc\": \"2.0\",
            \"method\": \"eth_getLogs\",
            \"params\": [{
                \"address\": \"$GUARDIAN_CONTRACT\",
                \"fromBlock\": \"0x0\",
                \"toBlock\": \"latest\",
                \"topics\": [\"0x66e8ebdac6fc6a42225d0a178aedd83ce2aeac3805b0e1a86c21fd20cb67ebd7\"]
            }],
            \"id\": 1
        }" | jq '.result | length')
    echo "   Total Flags: $logs"
}

get_icm_registrations() {
    echo -e "${GREEN}⚡ ICM Registrations (Primary Network):${NC}"
    local logs=$(curl -s -X POST $PRIMARY_RPC \
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

monitor_live() {
    while true; do
        clear
        echo "🔍 AI Content Guardian - Live ICM Monitoring"
        echo "============================================="
        echo "$(date)"
        echo ""
        
        # Network status
        echo -e "${YELLOW}📊 Network Status:${NC}"
        echo "   App Subnet Block: $(get_block_number $APP_SUBNET_RPC)"
        echo "   Security Subnet Block: $(get_block_number $SECURITY_SUBNET_RPC)"
        echo "   Primary Network Block: $(get_block_number $PRIMARY_RPC)"
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
