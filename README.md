# SMB Manager

Веб-панель для управления SMB/Samba-сервером.

## Возможности

- Создание и удаление SMB-пользователей.
- Создание и удаление SMB-папок.
- Настройка доступа пользователей к папкам.
- Права `RO` — только чтение.
- Права `RW` — чтение и запись.
- Гостевой доступ к папкам без логина и пароля.
- Управление Samba через веб-интерфейс.
- Хранение SMB-данных в `/mnt/samba`.
- Запуск через Docker Compose.

## Стек

- FastAPI
- React
- Nginx
- Samba
- Docker
- Docker Compose

## Запуск

```bash
docker compose up -d --build
```

После запуска веб-панель доступна на порту `8080`.

## SMB

Samba использует стандартные порты:

- `445` — SMB
- `139` — NetBIOS/SMB

Хранилище SMB находится на сервере:

```text
/mnt/samba
```

## Доступ

Обычные SMB-папки используют авторизацию пользователя.

Для гостевых папок можно выбрать:

- только чтение;
- чтение и запись.

Гостевой доступ осуществляется без логина и пароля.

## Структура проекта

```text
smb-manager/
├── backend/
├── frontend/
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## Конфигурация

Создайте `.env` на сервере на основе `.env.example`:

```env
ADMIN_TOKEN=change-this-to-a-strong-password
SMB_SERVER_NAME=SMB-SERVER
```

`ADMIN_TOKEN` используется для доступа к административной панели.

## Обновление на Linux-сервере

После изменения проекта локально:

```bash
git pull --ff-only
docker compose up -d --build
```
