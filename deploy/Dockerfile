FROM python:3.9

WORKDIR /usr/src

RUN apt-get update \
  && apt-get install -y \
  software-properties-common \
  build-essential

RUN apt-get -y update \
  && apt-get -y install \
    zip \
    git \
    wget \
    curl \
    dos2unix \
    awscli \
  && apt-get clean

COPY ./run.sh run.sh
RUN chmod +x run.sh

ENTRYPOINT ["/bin/bash", "run.sh"]
