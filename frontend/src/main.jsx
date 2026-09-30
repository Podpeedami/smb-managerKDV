import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Plus,
  Trash2,
  KeyRound,
  ShieldCheck,
  Server,
  Menu,
  X,
  Sun,
  Moon,
  ChevronRight,
  LockKeyhole,
  LogOut
} from 'lucide-react';
import './style.css';

const API = '/api';

function getToken() {
  return localStorage.getItem('smb_token') || '';
}

async function api(path, opts = {}) {
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    'x-admin-token': token,
    ...(opts.headers || {})
  };

  const response = await fetch(API + path, {
    ...opts,
    headers
  });

  if (!response.ok) {
    const message = await response.text();

    if (response.status === 401 || response.status === 403) {
      throw new Error('Неверный ADMIN_TOKEN');
    }

    throw new Error(message || `HTTP ${response.status}`);
  }

  return response.json();
}

function Login({ onLogin }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();

    if (!token.trim()) {
      setError('Введите ADMIN_TOKEN');
      return;
    }

    setLoading(true);
    setError('');

    try {
      localStorage.setItem('smb_token', token.trim());

      await api('/info');

      onLogin();
    } catch (error) {
      localStorage.removeItem('smb_token');
      setError(error.message || 'Не удалось подключиться к API');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginLogo">
          <Server />
        </div>

        <h1>SMB Manager</h1>

        <p className="loginSubtitle">
          Панель управления SMB-сервером
        </p>

        <form onSubmit={submit}>
          <label>
            ADMIN_TOKEN
            <div className="loginInput">
              <LockKeyhole />
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Введите токен администратора"
                autoFocus
              />
            </div>
          </label>

          {error && (
            <div className="loginError">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="primary loginButton"
            disabled={loading}
          >
            <KeyRound />
            {loading ? 'Проверка...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="overlay">
      <div className="modal">
        <div className="modalHead">
          <h2>{title}</h2>

          <button className="icon" onClick={onClose}>
            <X />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, value }) {
  return (
    <div className="card">
      <div className="cardIcon">
        <Icon />
      </div>

      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="empty">
      <FolderOpen />

      <b>{text}</b>

      <span>
        Создайте первый ресурс, чтобы он появился здесь.
      </span>
    </div>
  );
}

function App({ onLogout }) {
  const [page, setPage] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [shares, setShares] = useState({});
  const [info, setInfo] = useState({});
  const [collapsed, setCollapsed] = useState(false);

  const [dark, setDark] = useState(
    localStorage.getItem('dark') !== '0'
  );

  const load = async () => {
    try {
      const [usersData, sharesData, infoData] =
        await Promise.all([
          api('/users'),
          api('/shares'),
          api('/info')
        ]);

      setUsers(usersData);
      setShares(sharesData);
      setInfo(infoData);
    } catch (error) {
      if (
        error.message.includes('ADMIN_TOKEN') ||
        error.message.includes('401') ||
        error.message.includes('403')
      ) {
        localStorage.removeItem('smb_token');
        onLogout();
        return;
      }

      alert('Ошибка API: ' + error.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    document.body.className = dark ? 'dark' : '';
    localStorage.setItem('dark', dark ? '1' : '0');
  }, [dark]);

  const nav = [
    ['dashboard', 'Обзор', LayoutDashboard],
    ['users', 'Пользователи', Users],
    ['shares', 'SMB-папки', FolderOpen]
  ];

  return (
    <div className="app">
      <aside
        className={
          'sidebar ' + (collapsed ? 'collapsed' : '')
        }
      >
        <div className="brand">
          <Server />
          <span>SMB Manager</span>
        </div>

        <nav>
          {nav.map(([id, title, Icon]) => (
            <button
              className={page === id ? 'active' : ''}
              onClick={() => setPage(id)}
              key={id}
            >
              <Icon />
              <span>{title}</span>
            </button>
          ))}
        </nav>

        <div className="sideBottom">
          <button onClick={() => setDark(!dark)}>
            {dark ? <Sun /> : <Moon />}

            <span>
              {dark
                ? 'Светлая тема'
                : 'Тёмная тема'}
            </span>
          </button>

          <button onClick={onLogout}>
            <LogOut />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      <main>
        <header>
          <button
            className="icon"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu />
          </button>

          <div>
            <b>
              {nav.find((item) => item[0] === page)?.[1]}
            </b>

            <small>
              {info.server_name || 'SMB-сервер'}
            </small>
          </div>

          <div className="status">
            <i />
            Online
          </div>
        </header>

        <section className="content">
          {page === 'dashboard' ? (
            <Dashboard
              users={users}
              shares={shares}
              setPage={setPage}
            />
          ) : page === 'users' ? (
            <UsersPage
              users={users}
              reload={load}
            />
          ) : (
            <SharesPage
              shares={shares}
              users={users}
              reload={load}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function Dashboard({
  users,
  shares,
  setPage
}) {
  const list = Object.entries(shares);

  const access = list.reduce(
    (total, [, share]) =>
      total + Object.keys(share.access || {}).length,
    0
  );

  return (
    <>
      <div className="hero">
        <div>
          <div className="eyebrow">
            SERVER OVERVIEW
          </div>

          <h1>Управление SMB</h1>

          <p>
            Создавайте сетевые папки и управляйте
            доступом пользователей из одной современной
            панели.
          </p>
        </div>

        <button
          className="primary"
          onClick={() => setPage('shares')}
        >
          <Plus />
          Создать SMB-папку
        </button>
      </div>

      <div className="cards">
        <Card
          icon={Users}
          title="Пользователи"
          value={users.length}
        />

        <Card
          icon={FolderOpen}
          title="SMB-папки"
          value={list.length}
        />

        <Card
          icon={ShieldCheck}
          title="Права доступа"
          value={access}
        />

        <Card
          icon={Server}
          title="Сервер"
          value="Online"
        />
      </div>

      <div className="panel">
        <div className="panelTitle">
          <div>
            <h2>SMB-папки</h2>

            <span>
              Последние сетевые ресурсы
            </span>
          </div>

          <button
            className="ghost"
            onClick={() => setPage('shares')}
          >
            Все папки
            <ChevronRight />
          </button>
        </div>

        {list.length ? (
          <div>
            {list.slice(0, 6).map(([name, share]) => (
              <div className="row" key={name}>
                <div className="avatar">
                  <FolderOpen />
                </div>

                <div className="grow">
                  <b>{name}</b>

                  <small>
                    \\SERVER\{name} ·{' '}
                    {Object.keys(
                      share.access || {}
                    ).length}{' '}
                    пользователей
                  </small>
                </div>

                <span className="pill">
                  Активна
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="Пока нет SMB-папок" />
        )}
      </div>
    </>
  );
}

function UsersPage({ users, reload }) {
  const [modal, setModal] = useState(false);

  return (
    <>
      <div className="pageHead">
        <div>
          <h1>Пользователи</h1>

          <p>
            Учётные записи Samba и доступ к сетевым
            ресурсам.
          </p>
        </div>

        <button
          className="primary"
          onClick={() => setModal(true)}
        >
          <Plus />
          Создать пользователя
        </button>
      </div>

      <div className="panel">
        {users.length ? (
          <table>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Тип</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {users.map((username) => (
                <tr key={username}>
                  <td>
                    <div className="user">
                      <div className="avatar">
                        {username[0].toUpperCase()}
                      </div>

                      <b>{username}</b>
                    </div>
                  </td>

                  <td>SMB user</td>

                  <td>
                    <span className="pill">
                      Активен
                    </span>
                  </td>

                  <td>
                    <button
                      className="danger"
                      onClick={async () => {
                        if (
                          confirm(
                            'Удалить пользователя?'
                          )
                        ) {
                          await api(
                            '/users/' +
                              encodeURIComponent(
                                username
                              ),
                            {
                              method: 'DELETE'
                            }
                          );

                          reload();
                        }
                      }}
                    >
                      <Trash2 />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty text="Нет пользователей" />
        )}
      </div>

      {modal && (
        <UserModal
          close={() => setModal(false)}
          reload={reload}
        />
      )}
    </>
  );
}

function UserModal({ close, reload }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Modal
      title="Создать пользователя"
      onClose={close}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();

          try {
            await api('/users', {
              method: 'POST',
              body: JSON.stringify({
                username,
                password
              })
            });

            close();
            reload();
          } catch (error) {
            alert(error.message);
          }
        }}
      >
        <label>
          Логин

          <input
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
            placeholder="ivanov"
            required
          />
        </label>

        <label>
          Пароль

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            required
          />
        </label>

        <div className="actions">
          <button
            type="button"
            className="ghost"
            onClick={close}
          >
            Отмена
          </button>

          <button className="primary">
            <KeyRound />
            Создать
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SharesPage({
  shares,
  users,
  reload
}) {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const list = Object.entries(shares);

  return (
    <>
      <div className="pageHead">
        <div>
          <h1>SMB-папки</h1>

          <p>
            Сетевые ресурсы, пути и права доступа.
          </p>
        </div>

        <button
          className="primary"
          onClick={() => setModal(true)}
        >
          <Plus />
          Создать папку
        </button>
      </div>

      {list.length ? (
        <div className="grid">
          {list.map(([name, share]) => (
            <div
              className="shareCard"
              key={name}
            >
              <div className="shareTop">
                <div className="folderIcon">
                  <FolderOpen />
                </div>

                <button
                  className="danger"
                  onClick={async () => {
                    if (
                      confirm(
                        'Удалить SMB-папку и её содержимое?'
                      )
                    ) {
                      await api(
                        '/shares/' +
                          encodeURIComponent(name),
                        {
                          method: 'DELETE'
                        }
                      );

                      reload();
                    }
                  }}
                >
                  <Trash2 />
                </button>
              </div>

              <h2>{name}</h2>

              <code>
                \\SERVER\{name}
              </code>

              <p>
                {share.comment ||
                  'Без описания'}
              </p>

              <div className="accessPreview">
                {Object.entries(
                  share.access || {}
                )
                  .slice(0, 4)
                  .map(([username, access]) => (
                    <span key={username}>
                      {username}{' '}
                      <b>{access}</b>
                    </span>
                  ))}
              </div>

              <button
                className="manage"
                onClick={() =>
                  setSelected([
                    name,
                    share
                  ])
                }
              >
                Управление доступом
                <ChevronRight />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="panel">
          <Empty text="Нет SMB-папок" />
        </div>
      )}

      {modal && (
        <ShareModal
          close={() => setModal(false)}
          reload={reload}
        />
      )}

      {selected && (
        <AccessModal
          share={selected}
          users={users}
          close={() => setSelected(null)}
          reload={reload}
        />
      )}
    </>
  );
}

function ShareModal({ close, reload }) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [comment, setComment] = useState('');
  const [guest, setGuest] = useState(false);
  const [guestAccess, setGuestAccess] = useState('RO');

  return (
    <Modal
      title="Создать SMB-папку"
      onClose={close}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();

          try {
            await api('/shares', {
              method: 'POST',
              body: JSON.stringify({
                name,
                path,
                comment,
                guest,
                guest_access: guestAccess
              })
            });

            close();
            reload();
          } catch (error) {
            alert(error.message);
          }
        }}
      >
        <label>
          Название

          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Documents"
            required
          />
        </label>

        <label>
          Путь внутри /srv/samba

          <input
            value={path}
            onChange={(event) =>
              setPath(event.target.value)
            }
            placeholder="Documents"
          />
        </label>

        <label>
          Описание

          <input
            value={comment}
            onChange={(event) =>
              setComment(event.target.value)
            }
            placeholder="Общие документы"
          />
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={guest}
            onChange={(event) =>
              setGuest(event.target.checked)
            }
          />

          Гостевой доступ без логина и пароля
        </label>

        {guest && (
          <label>
            Права гостя

            <select
              value={guestAccess}
              onChange={(event) =>
                setGuestAccess(event.target.value)
              }
            >
              <option value="RO">
                Только чтение
              </option>

              <option value="RW">
                Чтение и запись
              </option>
            </select>
          </label>
        )}

        <div className="path">
          Папка:{' '}
          <b>
            /srv/samba/
            {path || name || '...'}
          </b>
        </div>

        <div className="actions">
          <button
            type="button"
            className="ghost"
            onClick={close}
          >
            Отмена
          </button>

          <button className="primary">
            <FolderOpen />
            Создать
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AccessModal({
  share,
  users,
  close,
  reload
}) {
  const [name, shareData] = share;

  const [username, setUsername] = useState('');
  const [mode, setMode] = useState('RW');

  return (
    <Modal
      title={'Доступ · ' + name}
      onClose={close}
    >
      <div className="shareDetail">
        <code>
          \\SERVER\{name}
        </code>

        <span>
          {Object.keys(
            shareData.access || {}
          ).length}{' '}
          пользователей
        </span>
      </div>

      <div className="accessList">
        {Object.entries(
          shareData.access || {}
        ).map(([user, access]) => (
          <div
            className="accessRow"
            key={user}
          >
            <div className="user grow">
              <div className="avatar small">
                {user[0].toUpperCase()}
              </div>

              <b>{user}</b>
            </div>

            <span
              className={'mode ' + access}
            >
              {access === 'RW'
                ? 'Чтение + запись'
                : 'Только чтение'}
            </span>

            <button
              className="danger"
              onClick={async () => {
                await api(
                  '/shares/' +
                    encodeURIComponent(name) +
                    '/access/' +
                    encodeURIComponent(user),
                  {
                    method: 'DELETE'
                  }
                );

                reload();
                close();
              }}
            >
              <Trash2 />
            </button>
          </div>
        ))}
      </div>

      <form
        onSubmit={async (event) => {
          event.preventDefault();

          try {
            await api(
              '/shares/' +
                encodeURIComponent(name) +
                '/access',
              {
                method: 'PUT',
                body: JSON.stringify({
                  username,
                  access: mode
                })
              }
            );

            reload();
            close();
          } catch (error) {
            alert(error.message);
          }
        }}
      >
        <div className="accessForm">
          <select
            value={username}
            onChange={(event) =>
              setUsername(event.target.value)
            }
            required
          >
            <option value="">
              Пользователь
            </option>

            {users
              .filter(
                (user) =>
                  !(shareData.access || {})[
                    user
                  ]
              )
              .map((user) => (
                <option
                  key={user}
                  value={user}
                >
                  {user}
                </option>
              ))}
          </select>

          <select
            value={mode}
            onChange={(event) =>
              setMode(event.target.value)
            }
          >
            <option value="RW">
              Чтение + запись
            </option>

            <option value="RO">
              Только чтение
            </option>
          </select>

          <button className="primary">
            <Plus />
            Добавить
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Root() {
  const [authenticated, setAuthenticated] =
    useState(Boolean(getToken()));

  function logout() {
    localStorage.removeItem('smb_token');
    setAuthenticated(false);
  }

  if (!authenticated) {
    return (
      <Login
        onLogin={() => setAuthenticated(true)}
      />
    );
  }

  return <App onLogout={logout} />;
}

createRoot(
  document.getElementById('root')
).render(<Root />);