FROM python:3.6-stretch

COPY server /home/app
COPY configs/supervisor/backend.conf /etc/supervisor/conf.d/backend.conf
COPY configs/uwsgi /home/config/uwsgi
COPY requirements.txt /home/requirements.txt
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN apt-get update && \
  apt-get install -y \
    software-properties-common \
    build-essential

RUN apt-get update && \
  apt-get install -y \
    postgresql \
    postgresql-contrib \
    wget \
    git \
    htop \
    nano \
    curl \
    lsof \
    supervisor \
    dos2unix && \
  rm -rf /var/lib/apt/lists/*

RUN useradd uwsgi && adduser uwsgi root
RUN useradd supervisor && adduser supervisor root

RUN pip install --upgrade pip && \
  pip install -r /home/requirements.txt

RUN touch /var/log/backend_out.log && \
  touch /var/log/django.log

RUN chmod g+w -R /var/log/

RUN dos2unix /docker-entrypoint.sh
RUN chown -R root /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 9000 9001

ENTRYPOINT ["/docker-entrypoint.sh"]
