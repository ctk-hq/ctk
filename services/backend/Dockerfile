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
  lsof \
  curl \
  supervisor && \
  rm -rf /var/lib/apt/lists/*

RUN wget https://github.com/kubernetes/kompose/releases/download/v1.26.1/kompose_1.26.1_amd64.deb
RUN apt install ./kompose_1.26.1_amd64.deb && \
  rm kompose_1.26.1_amd64.deb

RUN useradd uwsgi && adduser uwsgi root
RUN useradd supervisor && adduser supervisor root

COPY ./services/backend/requirements.txt ./requirements.txt
RUN pip install --upgrade pip && \
  pip install -r ./requirements.txt && \
  rm ./requirements.txt

COPY ./services/backend/src ./server
COPY ./services/backend/configs/supervisor/api.conf /etc/supervisor/conf.d/api.conf
COPY ./services/backend/configs/uwsgi ./configs/uwsgi

EXPOSE 9000 9001

HEALTHCHECK CMD curl --fail http://localhost:9000/v1 || exit 1 

CMD ["/usr/local/bin/uwsgi", "--ini", "/home/configs/uwsgi/uwsgi.ini"]
