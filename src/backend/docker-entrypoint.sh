#!/bin/bash

set -e

if [ "${DB_REMOTE}" = False ]; then
    echo "Waiting for Postgres..."

    while ! pg_isready -h "postgres" -p "5432" > /dev/null 2> /dev/null; do
        echo "Connecting to postgres Failed"
        sleep 1
    done

    >&2 echo "Postgres is up - executing command"
fi

rm -rf /tmp/uwsgi && \
	mkdir -p /tmp/uwsgi && \
	ln -s /home/config/uwsgi/uwsgi.ini /tmp/uwsgi/

/usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf

exec "$@"