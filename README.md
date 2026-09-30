# SMB Manager

Веб-панель для управления Samba-сервером.

## Возможности

- создание и удаление SMB-пользователей;
- изменение паролей пользователей;
- создание и удаление SMB-шар;
- назначение доступа `RW` (чтение/запись) и `RO` (только чтение);
- управление ACL;
- применение конфигурации Samba через веб-интерфейс;
- Docker и Docker Compose;
- постоянное хранение данных и конфигурации.

## Стек

- FastAPI
- React
- Nginx
- Samba
- Docker
- Docker Compose

## Требования

Linux-сервер с установленными Docker и Docker Compose Plugin.

Порты:

| Порт | Назначение |
|---|---|
| `445/tcp` | SMB |
| `139/tcp` | NetBIOS/SMB |
| `8080/tcp` | Web-панель |

> Порт `445` должен быть свободен на Linux-сервере.

## Установка

```bash
git clone https://github.com/Podpeedami/smb-managerKDV.git
cd smb-managerKDV
cp .env.example .env
nano .env
```

Укажи свой пароль администратора:

```env
ADMIN_TOKEN=your-strong-admin-password
SMB_SERVER_NAME=SMB-SERVER
```

## Запуск

```bash
docker compose up -d --build
docker compose ps
```

Просмотр логов:

```bash
docker compose logs -f
```

## Веб-панель

```text
http://SERVER_IP:8080
```

Для входа используется `ADMIN_TOKEN` из `.env`.

## SMB

После создания пользователя и SMB-шары:

```text
\\SERVER_IP\SHARE_NAME
```

Например:

```text
\\192.168.1.100\12
```

## Пользователи

Через веб-панель можно создавать, удалять пользователей и изменять их пароли.

Пользователь создаётся как системный пользователь Linux и пользователь Samba.

## SMB-шары

Для каждой шары можно указать имя, путь, комментарий, пользователей и уровень доступа.

- `RW` — чтение и запись;
- `RO` — только чтение.

## Хранение данных

```text
data/
samba/
samba-lib/
state/
```

| Директория | Назначение |
|---|---|
| `data/` | файлы SMB-шар |
| `samba/` | конфигурация Samba |
| `samba-lib/` | служебные данные Samba |
| `state/` | состояние SMB Manager |

Эти директории добавлены в `.gitignore`.

## Управление

Остановка:

```bash
docker compose down
```

Остановка без удаления контейнеров:

```bash
docker compose stop
```

Запуск:

```bash
docker compose start
```

Обновление:

```bash
git pull
docker compose up -d --build
```

## Проверка

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
curl http://127.0.0.1:8080/health
```

## Firewall

Для UFW:

```bash
sudo ufw allow 445/tcp
sudo ufw allow 139/tcp
sudo ufw allow 8080/tcp
sudo ufw status
```

## Архитектура

```text
                    Linux Server
                         │
              ┌──────────┴──────────┐
              │                     │
          Port 8080              Port 445
              │                     │
              ▼                     ▼
        ┌───────────┐        ┌────────────┐
        │  Nginx    │        │   Samba    │
        │ Frontend  │        │  Backend   │
        └─────┬─────┘        └────────────┘
              │
              │ /api
              ▼
        ┌───────────┐
        │  FastAPI  │
        │  Backend  │
        └───────────┘
```

## Docker Compose

### Backend

Отвечает за FastAPI API, Samba, пользователей, ACL, SMB-шары и применение конфигурации.

### Frontend

Отвечает за веб-интерфейс, авторизацию администратора, пользователей, SMB-шары и права доступа.

## Безопасность

Не добавляйте `.env` в Git.

Не используйте:

```text
change-this-to-a-strong-password
```

в рабочей системе.

Используйте собственный сложный `ADMIN_TOKEN`.

Не рекомендуется открывать порт `8080` непосредственно в интернет без дополнительной защиты, например reverse proxy с HTTPS.

## Репозиторий

https://github.com/Podpeedami/smb-managerKDV

## Лицензия

Проект распространяется согласно лицензии, указанной в репозитории.
