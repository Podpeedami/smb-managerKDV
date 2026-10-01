# SMB Manager KDV

Веб-панель управления Samba SMB-сервером.

Проект позволяет через веб-интерфейс управлять пользователями Samba,
создавать SMB-шары и назначать права доступа.

## Возможности

- создание и удаление SMB-пользователей;
- изменение паролей пользователей;
- создание SMB-шар;
- удаление SMB-шар;
- права доступа:
  - RO — только чтение;
  - RW — чтение и запись;
- гостевой доступ без логина и пароля;
- гостевые шары RO/RW;
- просмотр существующих пользователей и шар;
- веб-интерфейс;
- FastAPI backend;
- React frontend;
- Samba;
- Docker;
- Docker Compose;
- GitHub Actions;
- GitHub Container Registry (GHCR).

## Архитектура

```text
                    GitHub
                       │
                       │ git push
                       ▼
               GitHub Actions
                       │
              ┌────────┴────────┐
              ▼                 ▼
        Backend image      Frontend image
              │                 │
              └────────┬────────┘
                       ▼
                     GHCR
                       │
                       │ docker compose pull
                       ▼
                Linux Server
                       │
             ┌─────────┴─────────┐
             │                   │
       SMB Manager           Frontend
        Backend              Nginx
             │
             └────── Samba

Технологии

    Python

    FastAPI

    React

    Nginx

    Samba

    Docker

    Docker Compose

    GitHub Actions

    GitHub Container Registry

Структура проекта

smb-managerKDV/
│
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   └── app/
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│
├── samba/
│   └── smb.conf
│
├── samba-lib/
│
├── state/
│
├── .github/
│   └── workflows/
│       └── docker-publish.yml
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md

Docker Images

Docker-образы автоматически собираются GitHub Actions и публикуются
в GitHub Container Registry.

Backend:

ghcr.io/podpeedami/smb-managerkdv-backend:latest

Frontend:

ghcr.io/podpeedami/smb-managerkdv-frontend:latest

При каждом git push в ветку main GitHub Actions автоматически
пересобирает оба образа.
Переменные окружения

Создайте .env:

ADMIN_TOKEN=change-this-to-a-strong-password
SMB_SERVER_NAME=SMB-SERVER

.env не должен попадать в Git.

Для этого он добавлен в .gitignore.
Docker Compose

Сервер использует готовые Docker-образы из GHCR.

Backend:

image: ghcr.io/podpeedami/smb-managerkdv-backend:latest

Frontend:

image: ghcr.io/podpeedami/smb-managerkdv-frontend:latest

Используются следующие порты:

8000  — FastAPI
8080  — Web interface
445   — SMB
139   — NetBIOS/SMB

Хранилище SMB

Основное хранилище данных:

/mnt/samba

В контейнер оно подключается как:

/mnt/samba:/srv/samba

Конфигурация Samba:

./samba:/etc/samba

База Samba:

./samba-lib:/var/lib/samba

Состояние приложения:

./state:/state

Установка на Linux-сервер

Клонировать репозиторий:

git clone https://github.com/Podpeedami/smb-managerKDV.git
cd smb-managerKDV

Создать .env:

cp .env.example .env

Изменить пароль администратора:

nano .env

Создать каталог SMB:

mkdir -p /mnt/samba

Загрузить Docker-образы:

docker compose pull

Запустить проект:

docker compose up -d

Проверить контейнеры:

docker compose ps

Веб-интерфейс

После запуска панель доступна:

http://SERVER_IP:8080

Например:

http://192.168.1.100:8080

SMB

Подключение Windows:

\\SERVER_IP\SHARE_NAME

Например:

\\192.168.1.100\documents

Стандартный SMB-порт:

445

Гостевые SMB-шары

Шару можно создать с:

Гостевой доступ без логина и пароля

Доступ может быть:

RO — только чтение
RW — чтение и запись

Для гостевого RW используется системный пользователь:

nobody

Права пользователей

Для обычных SMB-пользователей можно назначать:

RO — Read Only
RW — Read/Write

Права сохраняются в конфигурации приложения и применяются к Samba.
Обновление сервера

После изменения кода разработчиком:

Windows
   │
   │ git push
   ▼
GitHub
   │
   ▼
GitHub Actions
   │
   ├── build backend
   └── build frontend
           │
           ▼
          GHCR
           │
           │ docker compose pull
           ▼
      Linux Server

На сервере выполняется:

cd ~/smb-managerKDV
git pull --ff-only
docker compose pull
docker compose up -d

Управление Docker

Проверить состояние:

docker compose ps

Перезапустить контейнеры:

docker compose restart

Посмотреть все логи:

docker compose logs -f

Логи backend:

docker compose logs -f backend

Логи frontend:

docker compose logs -f frontend

Остановить проект:

docker compose down

Запустить проект:

docker compose up -d

GitHub Actions

Workflow находится здесь:

.github/workflows/docker-publish.yml

Он запускается автоматически при:

git push origin main

Workflow:

    получает исходный код;

    авторизуется в GHCR;

    собирает backend;

    загружает backend image;

    собирает frontend;

    загружает frontend image.

Git workflow

Проверить изменения:

git status

Добавить изменения:

git add .

Создать commit:

git commit -m "Описание изменения"

Отправить на GitHub:

git push origin main

После успешного push GitHub Actions автоматически создаёт новые Docker-образы.
Обновление production

На сервере:

cd ~/smb-managerKDV
git pull --ff-only
docker compose pull
docker compose up -d

Сервер не выполняет локальную сборку Docker.

Он получает готовые образы из:

GitHub Container Registry

Firewall

Для работы веб-панели и SMB необходимо разрешить:

445/tcp
139/tcp
8080/tcp

Порт:

8000/tcp

нужен для прямого доступа к FastAPI, если он используется.
Репозиторий

GitHub:

https://github.com/Podpeedami/smb-managerKDV

GitHub Container Registry

Docker Images:

ghcr.io/podpeedami/smb-managerkdv-backend:latest
ghcr.io/podpeedami/smb-managerkdv-frontend:latest

Лицензия

Проект предназначен для внутреннего использования и управления
Samba SMB-сервером.


После сохранения:

```powershell
cd C:\Users\Den\smb-manager
git add README.md
git commit -m "Update README"
git push origin main