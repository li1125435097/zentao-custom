#!/usr/bin/env bash
set -euo pipefail

REMOTE_DIR="/home/ubuntu/zentao_manager/zentao-custom"
NODE_BIN="/home/ubuntu/.nvm/versions/node/v24.17.0/bin"

echo "Deploying to 199..."
ssh 199 "export PATH=${NODE_BIN}:\$PATH && cd ${REMOTE_DIR} && git pull && pm2 reload all"
echo "Deploy finished."
