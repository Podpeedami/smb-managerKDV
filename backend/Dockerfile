FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends     samba     samba-common-bin     acl     curl     passwd     procps    smbclient    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000 139 445
ENTRYPOINT ["/entrypoint.sh"]
