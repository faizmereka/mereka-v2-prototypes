#!/bin/bash

###############################################################################
# Stripe Payment API - Curl Test Commands
#
# Tests client payment methods and escrow payment intents for contracts
#
# Usage:
#   1. Update AUTH_TOKEN and USER_ID below
#   2. Make executable: chmod +x stripe-payment-curl.sh
#   3. Run: ./stripe-payment-curl.sh
#
# Requirements:
#   - Server running on http://localhost:3000
#   - Valid JWT token
#   - jq (for JSON formatting)
###############################################################################

# Configuration Variables (UPDATE THESE)
BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="YOUR_AUTH_TOKEN_HERE"
USER_ID="YOUR_USER_ID_HERE"

# Test data (will be populated during tests)
PAYMENT_METHOD_ID=""
PAYMENT_INTENT_ID=""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

###############################################################################
# Helper Functions
###############################################################################

print_test() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}▶ $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

print_data() {
    echo -e "${CYAN}→ $1${NC}"
}

check_response() {
    local status_code=$1
    local expected=$2
    local message=$3

    if [ "$status_code" -eq "$expected" ]; then
        print_success "$message (Status: $status_code)"
        return 0
    else
        print_error "$message - Expected $expected, got $status_code"
        return 1
    fi
}

###############################################################################
# 1. Payment Method Management Tests
###############################################################################

test_attach_payment_method() {
    print_test "1. Attach Payment Method"
    print_info "Attaching test payment method to customer..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/users/${USER_ID}/payment-methods" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "paymentMethodId": "pm_card_visa"
      }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    echo "$BODY" | jq .
    check_response "$HTTP_CODE" 200 "Payment method attached"

    # Extract payment method ID for later use
    PAYMENT_METHOD_ID=$(echo "$BODY" | jq -r '.data.id // empty')
    if [ -n "$PAYMENT_METHOD_ID" ]; then
        print_data "Payment Method ID: $PAYMENT_METHOD_ID"
    fi

    echo ""
}

test_list_payment_methods() {
    print_test "2. List Payment Methods"
    print_info "Fetching all payment methods for customer..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${BASE_URL}/users/${USER_ID}/payment-methods" \
      -H "Authorization: Bearer ${AUTH_TOKEN}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    echo "$BODY" | jq .
    check_response "$HTTP_CODE" 200 "Payment methods listed"

    # Count payment methods
    COUNT=$(echo "$BODY" | jq '.data | length')
    print_data "Found $COUNT payment method(s)"

    echo ""
}

test_set_default_payment_method() {
    print_test "3. Set Default Payment Method"

    if [ -z "$PAYMENT_METHOD_ID" ]; then
        print_error "No payment method ID available. Run attach test first."
        echo ""
        return 1
    fi

    print_info "Setting payment method as default..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "${BASE_URL}/users/${USER_ID}/payment-methods/default" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"paymentMethodId\": \"${PAYMENT_METHOD_ID}\"
      }")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    echo "$BODY" | jq .
    check_response "$HTTP_CODE" 200 "Default payment method set"

    echo ""
}

test_detach_payment_method() {
    print_test "4. Detach Payment Method"

    if [ -z "$PAYMENT_METHOD_ID" ]; then
        print_error "No payment method ID available. Run attach test first."
        echo ""
        return 1
    fi

    print_info "Detaching payment method from customer..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "${BASE_URL}/users/${USER_ID}/payment-methods/${PAYMENT_METHOD_ID}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    echo "$BODY" | jq .
    check_response "$HTTP_CODE" 200 "Payment method detached"

    echo ""
}

###############################################################################
# 2. Escrow Payment Intent Tests
###############################################################################

test_create_escrow_payment_intent() {
    print_test "5. Create Escrow Payment Intent"
    print_info "Creating payment intent with manual capture (escrow)..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/users/${USER_ID}/payment-intents/escrow" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "amount": 500000,
        "currency": "USD",
        "paymentMethodId": "pm_card_visa",
        "description": "First milestone payment - UI/UX Design Phase",
        "metadata": {
          "contractId": "contract_test_123",
          "milestoneId": "milestone_test_456",
          "jobId": "job_test_789",
          "expertId": "expert_test_001"
        },
        "confirm": true
      }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    echo "$BODY" | jq .
    check_response "$HTTP_CODE" 201 "Escrow payment intent created"

    # Extract payment intent ID for later use
    PAYMENT_INTENT_ID=$(echo "$BODY" | jq -r '.data.id // empty')
    if [ -n "$PAYMENT_INTENT_ID" ]; then
        print_data "Payment Intent ID: $PAYMENT_INTENT_ID"

        STATUS=$(echo "$BODY" | jq -r '.data.status')
        AMOUNT=$(echo "$BODY" | jq -r '.data.amount')
        print_data "Status: $STATUS | Amount: \$$(echo "scale=2; $AMOUNT/100" | bc)"
    fi

    echo ""
}

test_capture_payment_intent() {
    print_test "6. Capture Payment Intent"

    if [ -z "$PAYMENT_INTENT_ID" ]; then
        print_error "No payment intent ID available. Run create escrow test first."
        echo ""
        return 1
    fi

    print_info "Capturing payment intent (releasing escrow funds)..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/payment-intents/${PAYMENT_INTENT_ID}/capture" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json")

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    echo "$BODY" | jq .
    check_response "$HTTP_CODE" 200 "Payment intent captured"

    STATUS=$(echo "$BODY" | jq -r '.data.status // empty')
    if [ -n "$STATUS" ]; then
        print_data "Payment Status: $STATUS"
    fi

    echo ""
}

test_cancel_payment_intent() {
    print_test "7. Cancel Payment Intent"

    # Create a new payment intent for cancellation
    print_info "Creating payment intent to cancel..."

    CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/users/${USER_ID}/payment-intents/escrow" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "amount": 300000,
        "currency": "USD",
        "paymentMethodId": "pm_card_visa",
        "description": "Test cancellation",
        "metadata": {
          "contractId": "contract_cancel_test",
          "milestoneId": "milestone_cancel_test"
        }
      }')

    CANCEL_INTENT_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data.id // empty')

    if [ -z "$CANCEL_INTENT_ID" ]; then
        print_error "Failed to create payment intent for cancellation test"
        echo ""
        return 1
    fi

    print_data "Created Payment Intent: $CANCEL_INTENT_ID"
    print_info "Cancelling payment intent..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/payment-intents/${CANCEL_INTENT_ID}/cancel" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "cancellationReason": "requested_by_customer"
      }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    echo "$BODY" | jq .
    check_response "$HTTP_CODE" 200 "Payment intent cancelled"

    echo ""
}

###############################################################################
# 3. Error Case Tests
###############################################################################

test_error_user_not_found() {
    print_test "Error Test: User Not Found (404)"
    print_info "Testing with non-existent user ID..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/users/507f1f77bcf86cd799439099/payment-methods" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "paymentMethodId": "pm_card_visa"
      }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    echo "$BODY" | jq .
    check_response "$HTTP_CODE" 404 "Correctly returned 404 for non-existent user"

    echo ""
}

test_error_missing_payment_method_id() {
    print_test "Error Test: Missing Payment Method ID (400)"
    print_info "Testing with missing paymentMethodId..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/users/${USER_ID}/payment-methods" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{}')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    echo "$BODY" | jq .
    check_response "$HTTP_CODE" 400 "Correctly returned 400 for missing paymentMethodId"

    echo ""
}

test_error_invalid_amount() {
    print_test "Error Test: Invalid Amount (400)"
    print_info "Testing with negative amount..."

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/users/${USER_ID}/payment-intents/escrow" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "amount": -100,
        "currency": "USD",
        "paymentMethodId": "pm_card_visa",
        "description": "Invalid amount test",
        "metadata": {
          "contractId": "test"
        }
      }')

    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | head -n-1)

    echo "$BODY" | jq .
    check_response "$HTTP_CODE" 400 "Correctly returned 400 for invalid amount"

    echo ""
}

###############################################################################
# 4. Complete Workflow Tests
###############################################################################

test_complete_fixed_price_workflow() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║    Complete Fixed Price Contract Workflow                ║"
    echo "║    (Job → Proposal → Payment → Contract → Milestone)     ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""

    # Step 1: Attach payment method
    echo -e "${YELLOW}>>> Step 1: Adding Payment Method${NC}"
    test_attach_payment_method

    # Step 2: Create escrow payment intent for first milestone
    echo -e "${YELLOW}>>> Step 2: Creating Escrow Payment Intent${NC}"
    test_create_escrow_payment_intent

    # Step 3: Simulate milestone approval and capture payment
    echo -e "${YELLOW}>>> Step 3: Milestone Approved - Capturing Payment${NC}"
    test_capture_payment_intent

    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║    ✅ Fixed Price Workflow Complete                       ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

###############################################################################
# 5. Full Test Suite
###############################################################################

run_full_test_suite() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║    Stripe Payment API - Full Test Suite                  ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""

    # Payment Method Tests
    echo -e "${CYAN}═══ Payment Method Management Tests ═══${NC}"
    test_attach_payment_method
    test_list_payment_methods
    test_set_default_payment_method

    # Escrow Payment Intent Tests
    echo -e "${CYAN}═══ Escrow Payment Intent Tests ═══${NC}"
    test_create_escrow_payment_intent
    test_capture_payment_intent
    test_cancel_payment_intent

    # Error Case Tests
    echo -e "${CYAN}═══ Error Case Tests ═══${NC}"
    test_error_user_not_found
    test_error_missing_payment_method_id
    test_error_invalid_amount

    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║    ✅ All Tests Complete                                  ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

###############################################################################
# 6. Interactive Menu
###############################################################################

show_menu() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║    Stripe Payment API Test Menu                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "Payment Methods:"
    echo "  1) Attach payment method"
    echo "  2) List payment methods"
    echo "  3) Set default payment method"
    echo "  4) Detach payment method"
    echo ""
    echo "Escrow Payments:"
    echo "  5) Create escrow payment intent"
    echo "  6) Capture payment intent"
    echo "  7) Cancel payment intent"
    echo ""
    echo "Error Tests:"
    echo "  8) Test user not found error"
    echo "  9) Test missing payment method ID error"
    echo "  10) Test invalid amount error"
    echo ""
    echo "Workflows:"
    echo "  11) Run complete fixed price workflow"
    echo "  12) Run full test suite"
    echo ""
    echo "  0) Exit"
    echo ""
}

interactive_mode() {
    while true; do
        show_menu
        read -p "Select option: " choice
        echo ""

        case $choice in
            1) test_attach_payment_method ;;
            2) test_list_payment_methods ;;
            3) test_set_default_payment_method ;;
            4) test_detach_payment_method ;;
            5) test_create_escrow_payment_intent ;;
            6) test_capture_payment_intent ;;
            7) test_cancel_payment_intent ;;
            8) test_error_user_not_found ;;
            9) test_error_missing_payment_method_id ;;
            10) test_error_invalid_amount ;;
            11) test_complete_fixed_price_workflow ;;
            12) run_full_test_suite ;;
            0) echo "Exiting..."; exit 0 ;;
            *) print_error "Invalid option" ;;
        esac

        read -p "Press Enter to continue..."
        clear
    done
}

###############################################################################
# Main Execution
###############################################################################

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_error "jq is not installed. Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Check if variables are set
if [ "$AUTH_TOKEN" = "YOUR_AUTH_TOKEN_HERE" ] || [ "$USER_ID" = "YOUR_USER_ID_HERE" ]; then
    print_error "Please update AUTH_TOKEN and USER_ID variables at the top of this script"
    print_info "You can find these values in your .env file or database"
    exit 1
fi

# Check if server is running
if ! curl -s "${BASE_URL%/api/v1}/health" > /dev/null 2>&1; then
    print_error "Server is not running at ${BASE_URL%/api/v1}"
    print_info "Start the server with: npm run dev"
    exit 1
fi

print_success "Server is running at ${BASE_URL%/api/v1}"
echo ""

# Run based on arguments
if [ "$1" = "suite" ]; then
    run_full_test_suite
elif [ "$1" = "workflow" ]; then
    test_complete_fixed_price_workflow
elif [ "$1" = "menu" ] || [ -z "$1" ]; then
    interactive_mode
else
    # Allow running specific functions
    "$@"
fi
