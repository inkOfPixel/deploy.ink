#!/bin/bash
source ${HOME}/.bashrc

cd ${HOME}/deploy.ink/

echo "!! Github secret: ${GITHUB_WEBHOOK_SECRET}"

export NODE_ENV=production
npm start