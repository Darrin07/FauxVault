#!/bin/bash

SHOT=$1

case $SHOT in

  hardened)
    echo "=== SHOT 2: Brute Force — Hardened Mode ==="
    for i in {1..7}; do
      echo "--- attempt $i ---"
      curl -s -o /dev/null -w "HTTP %{http_code}\n" \
        -X POST http://localhost:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"identifier":"admin","password":"wrongpass"}'
    done
    ;;

  vulnerable)
    echo "=== SHOT 2: Brute Force — Vulnerable Mode ==="
    for i in {1..15}; do
      echo "--- attempt $i ---"
      curl -s -o /dev/null -w "HTTP %{http_code}\n" \
        -X POST http://localhost:3001/api/auth/login \
        -H "Content-Type: application/json" \
        -H "x-vulnerability-overrides: brute_force" \
        -d '{"identifier":"admin","password":"wrongpass"}'
    done
    ;;

  rls)
    echo "=== SHOT 3: RLS Secure Wrapper ==="
    TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
      -H "Content-Type: application/json" \
      -d "{\"identifier\":\"test_user\",\"password\":\"Password123\"}" | jq -r .token)

    echo "Token acquired: $TOKEN"

    curl -i -H "Authorization: Bearer $TOKEN" \
      http://localhost:3001/api/accounts/$ADMIN_ACCT_ID
    ;;

  *)
    echo "Usage: bash nn-demo.sh [hardened|vulnerable|rls]"
    ;;

esac
