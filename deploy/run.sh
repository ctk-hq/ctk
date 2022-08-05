#!/bin/bash

set -e

_ACTION=${ACTION:-}
_STAGE=${STAGE:-}

if [[ -z $_ACTION || -z $_STAGE ]]; then
  echo 'make sure action and stage are specified'
  exit 1
fi

python -m venv .env
source .env/bin/activate
pip install -r requirements.txt
pip install zappa==0.54.2

cd src

zappa ${_ACTION} ${_STAGE}
