FROM python:3.10-slim

WORKDIR /home

RUN apt-get update && \
  apt-get install -y \
  software-properties-common \
  build-essential

RUN apt-get update && \
  apt-get install -y \
  postgresql \
  postgresql-contrib \
  wget \
  nano \
  curl \
  lsof \
  supervisor && \
  rm -rf /var/lib/apt/lists/*

RUN useradd uwsgi && adduser uwsgi root
RUN useradd supervisor && adduser supervisor root

COPY ./services/backend/requirements.txt ./requirements.txt
RUN pip install --upgrade pip && \
  pip install -r ./requirements.txt && \
  rm ./requirements.txt

RUN touch /var/log/backend_out.log && \
  touch /var/log/django.log

RUN chmod g+w -R /var/log/

EXPOSE 9000 9001

COPY ./services/backend/src ./server
COPY ./services/backend/configs/supervisor/api.conf /etc/supervisor/conf.d/api.conf
COPY ./services/backend/configs/uwsgi ./config/uwsgi

RUN rm -rf /tmp/uwsgi && \
  mkdir -p /tmp/uwsgi && \
  ln -s ./config/uwsgi/uwsgi.ini /tmp/uwsgi/

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
