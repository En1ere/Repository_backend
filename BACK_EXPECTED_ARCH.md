# Ожидаемая архитектура backend-репозитория

Статус: архитектурный ориентир, не описание текущей реализации
Версия проекта: 0.1.111
Дата: 10 ноября 2026 года

## 1. Назначение

Документ фиксирует целевую структуру отдельного backend-репозитория продукта «Реестр вещей и мест хранения». Он служит ориентиром при инициализации, реализации вертикальных срезов, архитектурном ревью и последующем формировании `README.md` по фактическому коду.

Backend реализуется как модульный монолит с отдельными composition roots API и worker. Это не набор микросервисов и не буквальный перенос frontend-FSD. FSD-like принцип применяется как вертикальная группировка кода по бизнес-возможностям.

## 2. Основной подход

Верхний уровень состоит из bounded contexts. Внутри каждого контекста применяется направление зависимостей:

```text
http/jobs → application → domain
                ↑
          infrastructure
```

Главные правила:

- модуль владеет своими бизнес-правилами, таблицами, событиями и ошибками;
- `domain` не зависит от NestJS, Fastify, Kysely, PostgreSQL, S3 и e-mail;
- `application` содержит use cases и зависит от domain и собственных ports;
- adapters реализуют ports и связывают application с transport и infrastructure;
- межмодульные импорты проходят только через `public.ts`;
- API и worker используют одну application/domain реализацию;
- общие механизмы располагаются в `platform`, а не в бизнес-модулях;
- сложный межмодульный сценарий получает явный process orchestrator.

## 3. Целевая структура

```text
backend-repository/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── api.module.ts
│   │   │   └── bootstrap/
│   │   │       ├── fastify.ts
│   │   │       ├── openapi.ts
│   │   │       ├── security.ts
│   │   │       ├── validation.ts
│   │   │       └── shutdown.ts
│   │   └── test/
│   │
│   └── worker/
│       ├── src/
│       │   ├── main.ts
│       │   ├── worker.module.ts
│       │   └── bootstrap/
│       │       ├── lifecycle.ts
│       │       ├── health.ts
│       │       └── graceful-drain.ts
│       └── test/
│
├── packages/
│   ├── server/
│   │   └── src/
│   │       ├── processes/
│   │       │   ├── account-registration/
│   │       │   ├── entity-with-identifier/
│   │       │   ├── restore-with-identifiers/
│   │       │   └── account-deletion/
│   │       │
│   │       ├── modules/
│   │       │   ├── identity/
│   │       │   ├── workspaces-access/
│   │       │   ├── catalog-hierarchy/
│   │       │   ├── identifiers/
│   │       │   ├── files/
│   │       │   ├── search/
│   │       │   ├── audit-rollback/
│   │       │   ├── notifications/
│   │       │   ├── exports/
│   │       │   └── retention/
│   │       │
│   │       ├── platform/
│   │       │   ├── config/
│   │       │   ├── database/
│   │       │   ├── transactions/
│   │       │   ├── outbox/
│   │       │   ├── jobs/
│   │       │   ├── idempotency/
│   │       │   ├── object-storage/
│   │       │   ├── mail/
│   │       │   ├── security/
│   │       │   ├── http/
│   │       │   └── observability/
│   │       │
│   │       └── shared-kernel/
│   │           ├── ids/
│   │           ├── clock/
│   │           ├── decimal/
│   │           ├── pagination/
│   │           ├── result/
│   │           └── errors/
│   │
│   └── config/
│       ├── eslint/
│       ├── typescript/
│       └── vitest/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── scripts/
│
├── openapi/
│   ├── openapi.json
│   └── changelog.md
│
├── tests/
│   ├── architecture/
│   ├── contract/
│   ├── integration/
│   ├── concurrency/
│   ├── authorization/
│   ├── worker/
│   └── e2e/
│
├── docs/
│   ├── decisions/
│   ├── architecture/
│   └── runbooks/
│
├── package.json
├── pnpm-workspace.yaml
└── version-list.md
```

`packages/server` является приватным workspace-пакетом. Он нужен, чтобы API и worker использовали одну реализацию без зависимости одного приложения от другого. Делить каждый bounded context на отдельный npm-пакет в первой версии не требуется.

## 4. Зафиксированные модули

### `identity`

User, credentials, подтверждение e-mail, password reset, TOTP, recovery codes, sessions, trusted-device state и security audit.

### `workspaces-access`

Workspace, Membership, Invitation, ownership transfer, leave/remove и workspace authorization. Приглашения не выделяются в отдельный модуль.

### `catalog-hierarchy`

Entity, type details, tags, quantity, дерево, recent containers, move, archive/restore metadata. Дерево не загружается целиком как один агрегат; команда блокирует минимально необходимый набор строк.

### `identifiers`

Internal QR, barcode, Data Matrix, нормализация, resolve и active uniqueness.

### `files`

Attachment, upload intent, лимит слотов, обработка, primary photo, S3 lifecycle и cleanup.

### `search`

Read model, PostgreSQL FTS/trigram, rebuild и reconciliation. Источником истины остаётся каталог.

### `audit-rollback`

Append-only AuditEvent, UndoGrant, typed diff, dependency preview и versioned registry компенсирующих операций.

### `notifications`

Recipient snapshot, preferences, fan-out, feed и monotonic read boundary.

### `exports`

ExportJob, consistent snapshot, JSON/CSV, архив фотографий, выдача и очистка артефакта.

### `retention`

AccountDeletion, recovery proof, purge checkpoints, legal hold и backup tombstones. Модуль координирует уничтожение, но не становится владельцем данных остальных контекстов.

## 5. Шаблон модуля

```text
modules/catalog-hierarchy/
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── policies/
│   ├── events/
│   └── errors/
├── application/
│   ├── commands/
│   │   ├── create-entity/
│   │   ├── update-quantity/
│   │   ├── move-entity/
│   │   └── archive-entity/
│   ├── queries/
│   │   ├── get-entity/
│   │   ├── list-children/
│   │   └── get-path/
│   ├── ports/
│   └── dto/
├── adapters/
│   ├── http/
│   ├── persistence/
│   ├── jobs/
│   └── providers/
├── catalog-hierarchy-core.module.ts
├── catalog-hierarchy-http.module.ts
├── catalog-hierarchy-worker.module.ts
└── public.ts
```

Небольшой модуль не обязан иметь все каталоги. Структура отражает существующий код, а не создаёт пустые уровни.

## 6. Публичные границы

`public.ts` может экспортировать:

- application command/query contracts;
- минимальные read facades;
- versioned domain/application events;
- DI tokens для разрешённых ports;
- безопасные DTO результата и стабильные error codes.

Он не экспортирует repository implementations, Kysely table types, внутренние domain entities, Nest services и provider-specific clients.

Один модуль не читает и не изменяет таблицы другого произвольным repository. Межконтекстный read допускается только через назначенный query facade или явно документированную read model.

## 7. Межмодульные процессы

Слой `processes` используется только для сценариев, которые действительно пересекают владельцев данных:

- регистрация: identity + personal workspace + owner membership + outbox;
- создание сущности вместе со свободным identifier;
- restore ветки с проверкой identifier conflicts;
- account deletion: отзыв auth, передача ownership, retention и purge scheduling.

Process orchestrator:

- не создаёт новую копию доменных моделей;
- вызывает публичные application-порты модулей;
- задаёт одну явную транзакционную границу;
- не отправляет внешний эффект до commit;
- возвращает один согласованный результат или полностью откатывает операцию.

## 8. Транзакции и конкурентность

Типовой изменяющий use case выполняет:

1. открытие транзакции;
2. проверку session, membership и object authorization;
3. детерминированную блокировку необходимых строк;
4. проверку optimistic version и доменных инвариантов;
5. изменение состояния;
6. append-only audit;
7. создание outbox event;
8. commit.

Repository ports, audit и outbox должны работать в переданном `TransactionContext`. Скрытые вложенные транзакции между модулями запрещены.

На настоящем PostgreSQL проверяются гонки:

- invitation accept/decline/revoke/expiry;
- ownership transfer и leave/remove;
- move/archive/restore дерева;
- quantity update и Undo;
- параллельные photo slots и first-primary finalization;
- rollback preview/commit;
- account recovery против purge.

## 9. Outbox и jobs

`platform/outbox` и `platform/jobs` отвечают только за механизм:

- запись и claim;
- `FOR UPDATE SKIP LOCKED`;
- lease и восстановление stale lease;
- bounded retry с backoff и jitter;
- deduplication;
- dead/error state;
- метрики и безопасную диагностику.

Конкретный handler располагается в модуле-владельце, например:

```text
files/adapters/jobs/process-photo.handler.ts
exports/adapters/jobs/build-export.handler.ts
retention/adapters/jobs/purge-account.handler.ts
```

Job payload с первого выпуска содержит type, payload version, aggregate key/revision, correlation и causation. Handler повторно читает актуальное состояние перед внешним эффектом. Старый job сам по себе не является разрешением отправить письмо, создать notification или обработать удалённый объект.

API и worker используют раздельные DB pools и runtime roles. Worker backpressure не должен исчерпывать соединения API.

## 10. Idempotency

Повторяемые команды используют `Idempotency-Key`, fingerprint нормализованного payload и сохранённый status/body результата.

- тот же key и payload воспроизводят исходный результат;
- тот же key с другим payload возвращает стабильный конфликт;
- workspace-команда scoped по actor, route и workspace;
- account-команды без workspace получают явно определённый account/global scope;
- idempotency не заменяет row locks, optimistic version и domain validation.

## 11. HTTP и OpenAPI

Controllers являются transport adapters. Они:

- валидируют request boundary;
- извлекают session, CSRF, correlation и idempotency metadata;
- вызывают application use case;
- преобразуют typed result в HTTP response;
- не содержат SQL и бизнес-инвариантов.

Backend является владельцем `openapi/openapi.json`. Контракт содержит закрытые стабильные error codes, cursor pagination, `If-Match`/version semantics и единый error envelope.

После изменения контракта:

1. генерируется OpenAPI snapshot;
2. выполняется contract diff;
3. проверяется обратная совместимость;
4. публикуется версионированный artifact для frontend;
5. несовместимое удаление выполняется только после миграции frontend либо через новую API version.

## 12. Данные и миграции

- PostgreSQL является единственной основной БД.
- Kysely используется в persistence adapters, но не проникает в domain.
- SQL-миграции централизованы, упорядочены и после применения не редактируются.
- Startup migrations и schema sync запрещены.
- Seed содержит только синтетические local/test данные.
- Модуль является логическим владельцем таблиц, даже если миграции физически находятся в общем каталоге.
- Cross-module foreign keys допускаются осознанно, но не дают права обходить application boundary.

До baseline migration отдельными решениями закрываются:

- сериализация лимита photo slots через блокировку сущности;
- гарантия существования ровно одного owner;
- синхронизация archive state сущности и identifier;
- privileged purge policy для append-only audit;
- transactional или async search projection и допустимый lag;
- snapshot получателей notification на момент события.

## 13. Platform и shared kernel

`platform` содержит технические реализации: DB, transaction manager, jobs, S3 client, mail transport, HTTP policies, configuration и observability. Он не знает о конкретном бизнес-сценарии.

`shared-kernel` ограничен стабильными примитивами: ID, Clock, Decimal, Result, pagination и базовая typed error model. Membership, Entity, Invitation, audit payload и security policies не переносятся в shared kernel.

Универсальный каталог `utils` запрещён. Повтор кода сначала оценивается в контексте его предметного смысла; одинаковая форма кода не всегда означает общую ответственность.

## 14. Безопасность и наблюдаемость

- membership и object authorization проверяются на каждом workspace-scoped запросе и внутри критической транзакции;
- cookie sessions защищаются HttpOnly, Secure, SameSite и CSRF;
- auth, invitation и recovery endpoints имеют rate limits;
- секреты, открытые tokens, TOTP codes и чувствительные payload не попадают в логи;
- audit отделён от технических JSON-логов;
- каждый запрос и job несут request/correlation ID;
- health, readiness и liveness имеют различную семантику;
- отсутствие обязательной конфигурации останавливает соответствующий composition root или делает dependency not ready без небезопасного fallback.

## 15. Проверки

- unit: domain policies, value objects и application handlers с fake ports;
- integration: Kysely repositories, migrations и транзакции на настоящем PostgreSQL;
- concurrency: критические блокировки и сериализация;
- authorization: tenant isolation и object-level access;
- contract: OpenAPI snapshot, error codes и совместимость;
- worker: lease, retry, deduplication, replay и dead state;
- e2e: критические сценарии API + worker + PostgreSQL;
- architecture: запрет внутренних межмодульных импортов и обратных зависимостей.

## 16. Запрещённые направления

- глобальные каталоги `controllers`, `services` и `repositories` для всех доменов;
- бизнес-правила в controller, Nest guard или job dispatcher;
- прямой импорт repository или Nest service соседнего модуля;
- общий синхронный event bus для критических транзакционных изменений;
- внешний эффект до commit;
- произвольное восстановление состояния из audit `before` payload вместо allowlist-компенсаций;
- дублирование application-логики между API и worker;
- generic repository, скрывающий важные locks и запросы;
- добавление Redis, Elasticsearch, микросервисов, CQRS framework или event sourcing без измеримой необходимости и отдельного решения.

## 17. Критерии архитектурной готовности функции

Функция соответствует ориентиру, если:

- имеет одного владельца среди bounded contexts;
- реализована вертикальным срезом от migration до API/worker и тестов;
- сохраняет business invariants независимо от клиента;
- имеет явную transaction и authorization boundary;
- пишет audit/outbox в той же транзакции, когда это требуется;
- безопасна при retry, concurrency и неизвестном результате;
- не раскрывает внутренности соседнего модуля;
- документирует контракт, error codes и job payload version;
- диагностируется через correlation ID, structured logs и метрики;
- не создаёт новый архитектурный стиль внутри отдельной feature.
