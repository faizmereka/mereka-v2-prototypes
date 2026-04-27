#!/bin/bash

###############################################################################
# Hub Invitation API - Curl Test Commands
#
# Usage:
#   1. Update the variables below with your actual values
#   2. Make the script executable: chmod +x curl-commands.sh
#   3. Run individual functions or the entire test suite
#
# Requirements:
#   - Server running on http://localhost:3000
#   - Valid JWT token
#   - jq (optional, for pretty JSON formatting)
###############################################################################

# Configuration Variables (UPDATE THESE)
BASE_URL="http://localhost:3000/api/v1"
AUTH_TOKEN="YOUR_AUTH_TOKEN_HERE"
HUB_ID="YOUR_HUB_ID_HERE"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_test() {
    echo -e "${BLUE}=== $1 ===${NC}"
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

###############################################################################
# 1. Email Invitation Tests
###############################################################################

# 1.1 Create email invitations
create_email_invitations() {
    print_test "Creating Email Invitations"

    curl -X POST "${BASE_URL}/hubs/${HUB_ID}/members/invite" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "invitations": [
          {
            "email": "newadmin@test.com",
            "roleKey": "admin",
            "title": "Senior Admin"
          },
          {
            "email": "manager@test.com",
            "roleKey": "manager",
            "title": "Team Manager"
          },
          {
            "email": "viewer@test.com",
            "roleKey": "viewer"
          }
        ]
      }' | jq .

    print_success "Email invitations created"
    echo ""
}

# 1.2 Accept email invitation
accept_email_invitation() {
    INVITATION_TOKEN=$1
    print_test "Accepting Email Invitation"

    if [ -z "$INVITATION_TOKEN" ]; then
        print_error "Invitation token required"
        print_info "Usage: accept_email_invitation <invitation_token>"
        return 1
    fi

    curl -X POST "${BASE_URL}/invitations/${INVITATION_TOKEN}/accept" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

    print_success "Invitation accepted"
    echo ""
}

# 1.3 List pending invitations
list_pending_invitations() {
    print_test "Listing Pending Invitations"

    curl -X GET "${BASE_URL}/hubs/${HUB_ID}/invitations?page=1&limit=20" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

    echo ""
}

# 1.4 Cancel invitation
cancel_invitation() {
    MEMBER_ID=$1
    print_test "Cancelling Invitation"

    if [ -z "$MEMBER_ID" ]; then
        print_error "Member ID required"
        print_info "Usage: cancel_invitation <member_id>"
        return 1
    fi

    curl -X DELETE "${BASE_URL}/hubs/${HUB_ID}/invitations/${MEMBER_ID}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

    print_success "Invitation cancelled"
    echo ""
}

###############################################################################
# 2. Invitation Link Tests
###############################################################################

# 2.1 Create invitation link with usage limit
create_invitation_link() {
    print_test "Creating Invitation Link (Limited Uses)"

    curl -X POST "${BASE_URL}/hubs/${HUB_ID}/invitation-links" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "roleKey": "manager",
        "expiresInDays": 30,
        "maxUses": 10
      }' | jq .

    print_success "Invitation link created"
    print_info "Save the 'token' from response for joining"
    echo ""
}

# 2.2 Create unlimited invitation link
create_unlimited_link() {
    print_test "Creating Invitation Link (Unlimited Uses)"

    curl -X POST "${BASE_URL}/hubs/${HUB_ID}/invitation-links" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "roleKey": "viewer",
        "expiresInDays": 7
      }' | jq .

    print_success "Unlimited invitation link created"
    echo ""
}

# 2.3 Join via invitation link
join_via_link() {
    LINK_TOKEN=$1
    print_test "Joining Hub via Invitation Link"

    if [ -z "$LINK_TOKEN" ]; then
        print_error "Link token required"
        print_info "Usage: join_via_link <link_token>"
        return 1
    fi

    curl -X POST "${BASE_URL}/invitation-links/${LINK_TOKEN}/join" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

    print_success "Joined hub successfully"
    echo ""
}

# 2.4 List invitation links
list_invitation_links() {
    print_test "Listing Invitation Links"

    curl -X GET "${BASE_URL}/hubs/${HUB_ID}/invitation-links?page=1&limit=20" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

    echo ""
}

# 2.5 Filter links by status
filter_links_by_status() {
    STATUS=${1:-active}
    print_test "Filtering Invitation Links by Status: ${STATUS}"

    curl -X GET "${BASE_URL}/hubs/${HUB_ID}/invitation-links?status=${STATUS}&page=1&limit=20" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

    echo ""
}

# 2.6 Disable invitation link
disable_invitation_link() {
    LINK_ID=$1
    print_test "Disabling Invitation Link"

    if [ -z "$LINK_ID" ]; then
        print_error "Link ID required"
        print_info "Usage: disable_invitation_link <link_id>"
        return 1
    fi

    curl -X DELETE "${BASE_URL}/hubs/${HUB_ID}/invitation-links/${LINK_ID}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

    print_success "Invitation link disabled"
    echo ""
}

###############################################################################
# 3. Member Management Tests
###############################################################################

# 3.1 List all hub members
list_all_members() {
    print_test "Listing All Hub Members"

    curl -X GET "${BASE_URL}/hubs/${HUB_ID}/members?page=1&limit=20" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

    echo ""
}

# 3.2 Filter members by status
filter_members_by_status() {
    STATUS=${1:-active}
    print_test "Filtering Members by Status: ${STATUS}"

    curl -X GET "${BASE_URL}/hubs/${HUB_ID}/members?status=${STATUS}&page=1&limit=10" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

    echo ""
}

# 3.3 Filter members by role
filter_members_by_role() {
    ROLE_KEY=${1:-admin}
    print_test "Filtering Members by Role: ${ROLE_KEY}"

    curl -X GET "${BASE_URL}/hubs/${HUB_ID}/members?roleKey=${ROLE_KEY}&page=1&limit=10" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

    echo ""
}

# 3.4 Search members by name/email
search_members() {
    SEARCH_QUERY=$1
    print_test "Searching Members: ${SEARCH_QUERY}"

    if [ -z "$SEARCH_QUERY" ]; then
        print_error "Search query required"
        print_info "Usage: search_members <search_query>"
        return 1
    fi

    curl -X GET "${BASE_URL}/hubs/${HUB_ID}/members?search=${SEARCH_QUERY}&page=1&limit=10" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

    echo ""
}

# 3.5 Update member role
update_member_role() {
    MEMBER_ID=$1
    NEW_ROLE=${2:-manager}
    TITLE=${3:-"Team Member"}

    print_test "Updating Member Role"

    if [ -z "$MEMBER_ID" ]; then
        print_error "Member ID required"
        print_info "Usage: update_member_role <member_id> [role_key] [title]"
        return 1
    fi

    curl -X PATCH "${BASE_URL}/hubs/${HUB_ID}/members/${MEMBER_ID}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"roleKey\": \"${NEW_ROLE}\",
        \"title\": \"${TITLE}\"
      }" | jq .

    print_success "Member role updated"
    echo ""
}

# 3.6 Remove member
remove_member() {
    MEMBER_ID=$1
    print_test "Removing Member"

    if [ -z "$MEMBER_ID" ]; then
        print_error "Member ID required"
        print_info "Usage: remove_member <member_id>"
        return 1
    fi

    curl -X DELETE "${BASE_URL}/hubs/${HUB_ID}/members/${MEMBER_ID}" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" | jq .

    print_success "Member removed"
    echo ""
}

###############################################################################
# 4. Error Case Tests
###############################################################################

# 4.1 Test unauthorized request (401)
test_unauthorized() {
    print_test "Testing Unauthorized Request (Expected: 401)"

    curl -X POST "${BASE_URL}/hubs/${HUB_ID}/members/invite" \
      -H "Content-Type: application/json" \
      -d '{
        "invitations": [
          {
            "email": "test@test.com",
            "roleKey": "admin"
          }
        ]
      }' \
      -w "\nHTTP Status: %{http_code}\n" | jq .

    echo ""
}

# 4.2 Test invalid email format (400)
test_invalid_email() {
    print_test "Testing Invalid Email Format (Expected: 400)"

    curl -X POST "${BASE_URL}/hubs/${HUB_ID}/members/invite" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "invitations": [
          {
            "email": "not-an-email",
            "roleKey": "admin"
          }
        ]
      }' \
      -w "\nHTTP Status: %{http_code}\n" | jq .

    echo ""
}

# 4.3 Test invalid role (400)
test_invalid_role() {
    print_test "Testing Invalid Role (Expected: 400)"

    curl -X POST "${BASE_URL}/hubs/${HUB_ID}/members/invite" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{
        "invitations": [
          {
            "email": "test@test.com",
            "roleKey": "invalid-role"
          }
        ]
      }' \
      -w "\nHTTP Status: %{http_code}\n" | jq .

    echo ""
}

# 4.4 Test invalid invitation token (400)
test_invalid_invitation_token() {
    print_test "Testing Invalid Invitation Token (Expected: 400)"

    curl -X POST "${BASE_URL}/invitations/invalid-token-123/accept" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -w "\nHTTP Status: %{http_code}\n" | jq .

    echo ""
}

# 4.5 Test invalid link token (400)
test_invalid_link_token() {
    print_test "Testing Invalid Link Token (Expected: 400)"

    curl -X POST "${BASE_URL}/invitation-links/invalid-token-123/join" \
      -H "Authorization: Bearer ${AUTH_TOKEN}" \
      -w "\nHTTP Status: %{http_code}\n" | jq .

    echo ""
}

###############################################################################
# 5. Full Test Suite
###############################################################################

run_full_test_suite() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║    Hub Invitation API - Full Test Suite                  ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    # Email Invitations
    echo -e "${YELLOW}>>> Email Invitation Tests${NC}"
    create_email_invitations
    list_pending_invitations

    # Invitation Links
    echo -e "${YELLOW}>>> Invitation Link Tests${NC}"
    create_invitation_link
    create_unlimited_link
    list_invitation_links
    filter_links_by_status "active"

    # Member Management
    echo -e "${YELLOW}>>> Member Management Tests${NC}"
    list_all_members
    filter_members_by_status "active"
    filter_members_by_role "admin"

    # Error Cases
    echo -e "${YELLOW}>>> Error Case Tests${NC}"
    test_unauthorized
    test_invalid_email
    test_invalid_role
    test_invalid_invitation_token
    test_invalid_link_token

    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║    Test Suite Complete                                    ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

###############################################################################
# 6. Interactive Menu
###############################################################################

show_menu() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║    Hub Invitation API Test Menu                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "Email Invitations:"
    echo "  1) Create email invitations"
    echo "  2) Accept invitation (requires token)"
    echo "  3) List pending invitations"
    echo "  4) Cancel invitation (requires member ID)"
    echo ""
    echo "Invitation Links:"
    echo "  5) Create invitation link (limited uses)"
    echo "  6) Create unlimited link"
    echo "  7) Join via link (requires token)"
    echo "  8) List invitation links"
    echo "  9) Disable invitation link (requires link ID)"
    echo ""
    echo "Member Management:"
    echo "  10) List all members"
    echo "  11) Filter members by status"
    echo "  12) Filter members by role"
    echo "  13) Search members"
    echo "  14) Update member role (requires member ID)"
    echo "  15) Remove member (requires member ID)"
    echo ""
    echo "Testing:"
    echo "  16) Run all error case tests"
    echo "  17) Run full test suite"
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
            1) create_email_invitations ;;
            2) read -p "Enter invitation token: " token; accept_email_invitation "$token" ;;
            3) list_pending_invitations ;;
            4) read -p "Enter member ID: " id; cancel_invitation "$id" ;;
            5) create_invitation_link ;;
            6) create_unlimited_link ;;
            7) read -p "Enter link token: " token; join_via_link "$token" ;;
            8) list_invitation_links ;;
            9) read -p "Enter link ID: " id; disable_invitation_link "$id" ;;
            10) list_all_members ;;
            11) read -p "Enter status (active/invited/left): " status; filter_members_by_status "$status" ;;
            12) read -p "Enter role key (admin/manager/viewer): " role; filter_members_by_role "$role" ;;
            13) read -p "Enter search query: " query; search_members "$query" ;;
            14) read -p "Enter member ID: " id; read -p "Enter new role: " role; read -p "Enter title: " title; update_member_role "$id" "$role" "$title" ;;
            15) read -p "Enter member ID: " id; remove_member "$id" ;;
            16) test_unauthorized; test_invalid_email; test_invalid_role; test_invalid_invitation_token; test_invalid_link_token ;;
            17) run_full_test_suite ;;
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
    print_info "jq is not installed. Output will not be formatted."
    print_info "Install jq for better output: brew install jq (macOS) or apt-get install jq (Ubuntu)"
    echo ""
fi

# Check if variables are set
if [ "$AUTH_TOKEN" = "YOUR_AUTH_TOKEN_HERE" ] || [ "$HUB_ID" = "YOUR_HUB_ID_HERE" ]; then
    print_error "Please update AUTH_TOKEN and HUB_ID variables in the script"
    exit 1
fi

# Run based on arguments
if [ "$1" = "suite" ]; then
    run_full_test_suite
elif [ "$1" = "menu" ] || [ -z "$1" ]; then
    interactive_mode
else
    # Allow running specific functions
    "$@"
fi
