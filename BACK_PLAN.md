# План реализации backend-репозитория

Статус: исполнимый checklist первой версии

Связанный ориентир: `BACK_EXPECTED_ARCH.md`.

## 1. Правила выполнения

- [ ] Выполнять группы последовательно, если явно не указана независимость.
- [ ] Реализовывать каждый сценарий вертикально: migration → domain/application → adapter → OpenAPI → integration/concurrency tests.
- [ ] Не считать таблицу, DTO или controller готовой функцией без бизнес-инвариантов и проверок.
- [ ] Не добавлять Redis, Elasticsearch, микросервисы, CQRS framework или event sourcing без отдельного ADR и измеримой причины.
- [ ] Не выполнять startup migrations и не изменять применённые migration-файлы.
- [ ] После каждой группы обновлять OpenAPI, архитектурную документацию, версию backend-репозитория и его журнал изменений.

## 2. Карта зависимостей

- [ ] `foundation` завершить до всех бизнес-модулей.
- [ ] `identity` завершить до защищённых workspace-сценариев.
- [ ] `workspaces-access` завершить до catalog, search, files и exports.
- [ ] `catalog-hierarchy` завершить до move, identifiers, files, archive и rollback.
- [ ] `outbox`, jobs, audit и idempotency подготовить до первой бизнес-мутации.
- [ ] `retention` начинать после стабилизации identity, workspaces, files, search и exports.

## 3. Решения и contract baseline

- [ ] Зафиксировать split-repository модель как актуальную и исключить прежний общий `apps/web/api/worker` layout.
- [ ] Определить публикацию, версионирование и breaking-diff проверку OpenAPI artifact между репозиториями.
- [ ] Проверить согласованность `API_DRAFT.md`, `DOMAIN_MODEL.md`, SQL baseline и списка bounded contexts.
- [ ] Зафиксировать владельца данных и публичную application-границу каждого модуля.
- [ ] Формализовать REST conventions: `/api/v1`, cookie-session, CSRF, error envelope, pagination, version и idempotency.
- [ ] Зафиксировать обязательные TTL, rate limits, cursor/page limits, quotas и retention как валидируемую конфигурацию.
- [ ] Принять ADR по transactional или async search projection и допустимому lag.
- [ ] Зафиксировать job lease, retry, DLQ, payload versioning, ordering и replay policy.
- [ ] Зафиксировать e-mail delivery lifecycle для verification, reset, invitation и account recovery.
- [ ] Зафиксировать file processing policy: MIME, checksum, pixels, normalization, thumbnail и cleanup.
- [ ] Зафиксировать audit taxonomy, allowlist-компенсации и snapshot получателей notification на момент события.
- [ ] Зафиксировать export snapshot/schema и защиту CSV.
- [ ] Зафиксировать account deletion, recovery, legal hold, purge и backup tombstone policy.
- [ ] Провести threat model tenant isolation, auth, CSRF, invitation/QR enumeration, file abuse, rollback и purge.
- [ ] Зафиксировать quality, performance, worker lag, SLO, RPO и RTO budgets либо явно пометить production-значения `TBD by owner`.

Критерий завершения:

- [ ] До первой миграции нет открытого решения, способного изменить публичный контракт, владение данными или транзакционную границу.

## 4. Каркас репозитория и архитектурные границы

- [ ] Инициализировать pnpm workspace.
- [ ] Создать `apps/api`, `apps/worker`, `packages/server` и `packages/config`.
- [ ] Зафиксировать поддерживаемую Node.js LTS в `engines` и toolchain.
- [ ] Включить TypeScript strict без необоснованных подавлений ошибок.
- [ ] Настроить ESLint, Prettier, Vitest, build и typecheck.
- [ ] Создать composition roots API и worker без бизнес-логики в bootstrap.
- [ ] Создать bounded contexts из `BACK_EXPECTED_ARCH.md`.
- [ ] Добавить `public.ts` для разрешённой поверхности каждого модуля.
- [ ] Запретить внутренние межмодульные импорты через ESLint и architecture tests.
- [ ] Запретить зависимость domain от NestJS, Kysely, Fastify и provider SDK.
- [ ] Настроить graceful shutdown API и worker.
- [ ] Добавить синтетические test fixtures без реальных пользовательских данных.

Критерий завершения:

- [ ] Чистая установка, typecheck, lint, unit tests и build выполняются штатными командами.
- [ ] Architecture tests обнаруживают обратный или внутренний межмодульный импорт.

## 5. Конфигурация и runtime boundaries

- [ ] Определить типизированную схему переменных окружения.
- [ ] Разделить public, API-only и worker-only конфигурацию.
- [ ] Останавливать composition root при отсутствии обязательного параметра.
- [ ] Исключить небезопасные production defaults.
- [ ] Подготовить `.env.example` без секретов.
- [ ] Настроить отдельные PostgreSQL pools для API, worker и migrations.
- [ ] Настроить разные runtime/migration DB roles.
- [ ] Определить таймауты HTTP, DB и внешних провайдеров.
- [ ] Зафиксировать clock, ID и crypto abstractions для тестируемости.

## 6. PostgreSQL и миграции

- [ ] Перенести SQL baseline в упорядоченные immutable migrations.
- [ ] Подключить необходимые extensions, включая `pg_trgm`.
- [ ] Реализовать команды migration status/check/apply без автоматического запуска.
- [ ] Подготовить синтетический local/test seed.
- [ ] Создать типизированный Kysely database contract.
- [ ] Проверить tenant-safe составные foreign keys.
- [ ] Проверить UTC timestamps и decimal-семантику quantity.
- [ ] Исправить конкурентную защиту photo slots блокировкой `Entity`.
- [ ] Гарантировать ровно одного owner сериализованной application-командой.
- [ ] Согласовать атомарную синхронизацию archive state сущности и identifier.
- [ ] Определить privileged purge policy для append-only audit.
- [ ] Проверить forward migration на пустой и заполненной test DB.
- [ ] Проверить rollback/restore-процедуру без редактирования применённых миграций.

## 7. HTTP foundation и OpenAPI

- [ ] Подключить NestJS с Fastify adapter.
- [ ] Зафиксировать префикс `/api/v1`.
- [ ] Реализовать единый error envelope со стабильным `error.code` и внешним `requestId`.
- [ ] Добавить внутренние correlation и causation metadata.
- [ ] Настроить runtime validation request/response boundary.
- [ ] Настроить cursor pagination primitives.
- [ ] Определить обработку `If-Match` и явного `version`.
- [ ] Добавить безопасный HTTP error mapper для domain/application errors.
- [ ] Генерировать `openapi/openapi.json`.
- [ ] Добавить проверку OpenAPI diff и breaking changes.
- [ ] Публиковать versioned OpenAPI artifact для frontend.
- [ ] Не включать stack trace, SQL и provider payload в публичные ошибки.

## 8. Наблюдаемость и эксплуатационный фундамент

- [ ] Настроить структурированные JSON-логи.
- [ ] Добавить redaction cookie, токенов, паролей, TOTP, e-mail proof и provider payload.
- [ ] Разделить технические логи, security audit и workspace audit.
- [ ] Реализовать liveness, health и readiness с различной семантикой.
- [ ] Добавить метрики HTTP latency/errors, DB pool, jobs, retries и dead jobs.
- [ ] Протянуть correlation/causation ID через HTTP, транзакцию, outbox и job.
- [ ] Подготовить безопасные диагностические коды внешних ошибок.
- [ ] Добавить graceful worker drain и метрики незавершённых leases.

## 9. Транзакции, outbox, jobs и idempotency

- [ ] Реализовать явный `TransactionContext`.
- [ ] Запретить скрытые вложенные транзакции между модулями.
- [ ] Создавать audit/outbox в транзакции доменного изменения.
- [ ] Реализовать PostgreSQL job claim через `FOR UPDATE SKIP LOCKED`.
- [ ] Реализовать lease owner/expiry и восстановление stale lease.
- [ ] Реализовать bounded retry с backoff и jitter.
- [ ] Добавить deduplication key и dead/error state.
- [ ] Версионировать job payload с первого выпуска.
- [ ] Повторно читать актуальное состояние перед внешним эффектом.
- [ ] Реализовать `Idempotency-Key` с fingerprint нормализованного payload.
- [ ] Воспроизводить сохранённые status/body для того же key и payload.
- [ ] Возвращать конфликт при повторном key с другим payload.
- [ ] Определить workspace, account и global idempotency scopes.
- [ ] Согласовать SQL uniqueness со scope, включая одинаковый key в разных workspaces.
- [ ] Добавить cleanup jobs для outbox, jobs и idempotency records.
- [ ] Покрыть claim, retry, replay, deduplication и stale lease integration-тестами.

## 10. Identity: аккаунт и регистрация

- [ ] Создать User и AuthCredential domain/application модели.
- [ ] Реализовать нормализацию e-mail и active-account uniqueness.
- [ ] Реализовать Argon2id password hashing через identity port.
- [ ] Создавать User, personal Workspace и owner Membership одной транзакцией.
- [ ] Создавать email verification token только в hashed-виде.
- [ ] Добавить TTL, single-use, revoke и повторную отправку verification token.
- [ ] Отправлять verification e-mail через outbox/job.
- [ ] Не выдавать полный доступ до подтверждения e-mail.
- [ ] Сделать register безопасным при повторе через idempotency.
- [ ] Не раскрывать существование e-mail различающимися recovery-ответами.
- [ ] Добавить auth rate limits и безопасные security logs.
- [ ] Покрыть регистрацию transaction rollback и concurrency-тестами.

## 11. Identity: серверные сессии и CSRF

Согласованный контракт не использует access/refresh JWT. Авторизация основана на серверной PostgreSQL-сессии.

- [ ] Генерировать криптографически случайный session identifier.
- [ ] Хранить только hash session identifier.
- [ ] Выдавать session cookie с `HttpOnly`, `Secure` и согласованным `SameSite`.
- [ ] Реализовать CSRF-защиту изменяющих cookie-запросов.
- [ ] Реализовать idle и absolute session expiry.
- [ ] Обновлять last activity без чрезмерной write-нагрузки.
- [ ] Возвращать единый `AUTH_SESSION_EXPIRED` для истёкшей или отозванной сессии.
- [ ] Реализовать logout, revoke one, revoke others и revoke all.
- [ ] Не раскрывать полный IP в списке сессий.
- [ ] Отзывать все сессии при удалении аккаунта.
- [ ] Отзывать остальные сессии при смене пароля.
- [ ] Проверить невозможность session fixation и повторного использования отозванной cookie.

## 12. Identity: пароль, TOTP и recovery codes

- [ ] Реализовать forgot/reset password через hashed single-use proof.
- [ ] Добавить TTL, cooldown и rate limit password recovery.
- [ ] Инвалидировать proof после успешного reset.
- [ ] Реализовать короткоживущий TOTP setup state.
- [ ] Шифровать TOTP secret с versioned encryption key.
- [ ] Не активировать TOTP до подтверждения корректного кода.
- [ ] Сгенерировать восемь recovery codes и показать их один раз.
- [ ] Хранить recovery codes только как стойкие hashes.
- [ ] Атомарно потреблять recovery code.
- [ ] Защитить конкурентное повторное использование TOTP/recovery proof.
- [ ] Реализовать regeneration с инвалидированием предыдущего набора.
- [ ] Реализовать отключение TOTP с отзывом recovery codes и trusted devices.
- [ ] Реализовать trusted-device state внутри server session.
- [ ] Ограничить доверие устройства согласованным сроком.
- [ ] Вести отдельный security audit без секретов.
- [ ] Покрыть bypass, replay, race и clock-window сценарии тестами.

## 13. Workspaces и memberships

- [ ] Реализовать list/create/get/update workspace.
- [ ] Гарантировать ровно одно personal workspace на аккаунт.
- [ ] Запретить ручное создание и приглашения в personal workspace.
- [ ] Создавать shared workspace вместе с owner Membership.
- [ ] Реализовать централизованную workspace access policy.
- [ ] Проверять membership на каждом workspace-scoped запросе.
- [ ] Повторно проверять membership внутри критической транзакции.
- [ ] Реализовать members list.
- [ ] Реализовать member leave с отзывом созданных им активных приглашений.
- [ ] Запретить owner leave до отдельного ownership transfer.
- [ ] Реализовать owner remove member с немедленным отзывом доступа.
- [ ] Реализовать ownership transfer одной сериализованной транзакцией.
- [ ] Сохранять каталог и audit после выхода или исключения участника.
- [ ] Покрыть tenant isolation и concurrent ownership tests.

## 14. Invitations

- [ ] Создать Invitation lifecycle: pending, accepted, declined, revoked и expired.
- [ ] Хранить invitation token только как hash.
- [ ] Реализовать семидневный срок через конфигурацию.
- [ ] Запретить дубликат active membership или pending invitation.
- [ ] Разрешить отзыв автору приглашения и owner.
- [ ] Реализовать безопасный invitation preview.
- [ ] Проверять подтверждённый e-mail получателя.
- [ ] Атомарно создавать Membership при accept.
- [ ] Реализовать идемпотентный decline без Membership.
- [ ] Сериализовать accept/decline/revoke/expiry блокировкой Invitation.
- [ ] Отправлять invitation e-mail через outbox/job.
- [ ] Реализовать expiration worker/reconciliation.
- [ ] Возвращать стабильные expired/revoked/declined/mismatch error codes.
- [ ] Покрыть терминальные гонки concurrency-тестами.

## 15. Каталог и дерево

- [ ] Реализовать Entity, PlaceDetails, ContainerDetails, ItemDetails и Tag.
- [ ] Реализовать create place/container/item.
- [ ] Подставлять quantity `1` для item/container и запрещать её для place.
- [ ] Передавать decimal quantity строкой без float.
- [ ] Реализовать root, children, entity и path queries.
- [ ] Использовать cursor pagination для children.
- [ ] Не загружать всё дерево при открытии корня.
- [ ] Проверять одинаковый workspace родителя и ребёнка.
- [ ] Проверять `canContain`.
- [ ] Исключать cycle и глубину более 30.
- [ ] Реализовать optimistic version.
- [ ] Реализовать атомарные quantity increment/set без отрицательного результата.
- [ ] Записывать отдельный audit event для каждой quantity-команды.
- [ ] Реализовать recent containers как user/workspace-scoped projection.
- [ ] Отбрасывать недоступные и архивные recent containers при чтении.
- [ ] Добавить audit/outbox к значимым мутациям.
- [ ] Покрыть дерево, decimal, pagination, tenant и concurrency тестами.

## 16. Search

- [ ] Принять ADR: transactional projection для v1 либо async projection с допустимым lag.
- [ ] Реализовать PostgreSQL FTS и `pg_trgm`.
- [ ] Индексировать только согласованные поля.
- [ ] Добавить structured filters отдельно от текста.
- [ ] Исключать архив из обычного поиска.
- [ ] Проверять актуальный membership и archive state при чтении.
- [ ] Реализовать отдельный archive search.
- [ ] Реализовать bounded cross-workspace fan-out только по явному запросу.
- [ ] Группировать cross-workspace результаты по workspace.
- [ ] Не маскировать частичный DB/provider failure пустым результатом.
- [ ] Реализовать versioned rebuild/reconciliation.
- [ ] Проверить отсутствие утечки snippets/counts между workspace.

## 17. Move и быстрый Undo

- [ ] Реализовать move command с `Idempotency-Key`.
- [ ] Зафиксировать детерминированный порядок locks.
- [ ] Повторно проверить membership, version, parent, cycle, depth и workspace.
- [ ] Изменить parent и audit path одной транзакцией.
- [ ] Добавить notification outbox event.
- [ ] Создать opaque hashed single-use UndoGrant.
- [ ] Ограничить Undo серверным expiry.
- [ ] Проверять expected versions и зависимости при Undo.
- [ ] Не разрешать межworkspace move.
- [ ] Покрыть concurrent moves, stale version и retry тестами.

## 18. Identifiers

- [ ] Реализовать нормализацию barcode, Data Matrix и custom с version.
- [ ] Обеспечить active uniqueness в пределах workspace/type.
- [ ] Реализовать безопасный resolve без раскрытия чужого workspace.
- [ ] Генерировать непрогнозируемый internal QR.
- [ ] Хранить internal QR в необратимом представлении.
- [ ] Показывать открытое internal QR значение только при создании.
- [ ] Реализовать attach/detach identifier.
- [ ] Атомарно создавать Entity вместе со свободным identifier.
- [ ] Не выполнять автоматическую перепривязку при конфликте.
- [ ] Синхронизировать identifier archive state с Entity.
- [ ] Проверять конфликты всей ветки до restore.
- [ ] Покрыть uniqueness, normalization, archive/restore и tenant tests.

## 19. Фотографии и object storage

- [ ] Определить S3-compatible port без provider-specific domain API.
- [ ] Реализовать upload intent с короткоживущей signed operation.
- [ ] Резервировать photo slot транзакционно под lock Entity.
- [ ] Ограничить три активных слота с учётом промежуточных состояний.
- [ ] Реализовать complete как переход в processing и постановку job.
- [ ] Не переводить upload напрямую в ready.
- [ ] Сериализовать cancel/complete/retry.
- [ ] Проверять фактический MIME, размер, checksum и pixel/decompression limits.
- [ ] Удалять EXIF/GPS через Sharp.
- [ ] Создавать thumbnail.
- [ ] Детерминированно назначать ровно одно primary.
- [ ] Сериализовать конкурентное завершение первых фотографий.
- [ ] Реализовать set primary и replacement primary при delete.
- [ ] Переводить удаление в detached до физической очистки.
- [ ] Настроить cleanup incomplete/failed/detached objects.
- [ ] Не запускать cleanup фотографии при простой архивации сущности.
- [ ] Покрыть race, quota, invalid payload, orphan и provider failure tests.

## 20. Архив и восстановление

- [ ] Реализовать ArchiveOperation для корня и поддерева.
- [ ] Атомарно архивировать всю выбранную ветку.
- [ ] Сохранить original parent/path и descendant count.
- [ ] Исключить архив из active navigation, search и identifier resolve.
- [ ] Реализовать root archive list без дублирования потомков.
- [ ] Реализовать read-only archive details.
- [ ] Восстанавливать к исходному родителю, если он доступен.
- [ ] Требовать новый parent при недоступном исходном.
- [ ] До изменения проверить membership, versions, cycle, depth, canContain и identifier conflicts всей ветки.
- [ ] Отменять restore целиком при любом конфликте.
- [ ] Реализовать Undo archive и Undo restore через UndoGrant.
- [ ] Не добавлять пользовательский hard-delete endpoint.
- [ ] Покрыть subtree atomicity и restore conflicts тестами.

## 21. Audit и цепочный rollback

- [ ] Реализовать неизменяемый ActorSnapshot без удаляемой PII.
- [ ] Записывать AuditEvent append-only.
- [ ] Ограничить UPDATE/DELETE runtime DB-role.
- [ ] Разделить workspace audit и security audit.
- [ ] Определить versioned typed diff schema для каждого события.
- [ ] Создать allowlist registry обратимых event types.
- [ ] Запретить generic restore произвольного `before` payload.
- [ ] Реализовать dependency graph и blocking chain.
- [ ] Реализовать rollback preview с revision и expiry.
- [ ] Ограничить размер цепочки конфигурацией.
- [ ] Повторно проверять права и все versions перед commit.
- [ ] Применять компенсации в обратном порядке одной транзакцией.
- [ ] Создавать новые audit events вместо изменения старых.
- [ ] Реализовать Undo только что выполненной компенсации.
- [ ] Исключить auth, TOTP, session и account deletion из catalog rollback.
- [ ] Покрыть stale preview, unrelated changes и all-or-nothing tests.

## 22. Notifications

- [ ] Зафиксировать versioned taxonomy значимых событий.
- [ ] Сохранять snapshot получателей в момент доменного события.
- [ ] Не вычислять получателей по membership на момент выполнения worker.
- [ ] Создавать fan-out через outbox/job.
- [ ] Обеспечить deduplication по recipient, event и type.
- [ ] Не уведомлять автора собственного действия.
- [ ] Реализовать workspace-scoped feed и cursor pagination.
- [ ] Реализовать all/unread filter.
- [ ] Реализовать monotonic mark-read по IDs или read-through boundary.
- [ ] Запретить mark-read чужих, будущих или относящихся к другому workspace уведомлений.
- [ ] Реализовать workspace catalog notification preference.
- [ ] Не отключать preference системные security/invitation события.
- [ ] Поддержать polling/refetch без скрытой WebSocket-зависимости.
- [ ] Покрыть delayed worker, membership changes и duplicate delivery tests.

## 23. Экспорт

- [ ] Реализовать создание ExportJob через idempotent command.
- [ ] Ограничить list/status экспортами текущего requester и workspace.
- [ ] Зафиксировать consistent snapshot marker.
- [ ] Сформировать JSON со структурой, identifiers, tags и file references.
- [ ] Сформировать CSV с полным path.
- [ ] Защитить CSV от formula injection.
- [ ] Добавить фотографии отдельными файлами архива.
- [ ] Разделить active и archived данные.
- [ ] Исключить auth secrets, sessions, invitations и настройки других аккаунтов.
- [ ] Реализовать queued, processing, ready, failed и expired.
- [ ] Реализовать retry failed как новую попытку.
- [ ] Не переиспользовать expired export.
- [ ] Повторно проверять session и membership перед download URL.
- [ ] Выдавать короткоживущий URL без object key в API.
- [ ] Идемпотентно очищать expired и partial artifacts.
- [ ] Покрыть snapshot consistency, large export, cleanup и access-loss tests.

## 24. Удаление аккаунта, recovery и retention

- [ ] Реализовать AccountDeletion state machine.
- [ ] Сделать `DELETE /account` идемпотентным.
- [ ] Одной транзакцией перевести User в deletionPending.
- [ ] Отозвать sessions, trusted devices, auth/recovery tokens и active invitations.
- [ ] Передать каждый shared workspace старейшему оставшемуся участнику.
- [ ] Использовать `joinedAt`, затем стабильный `userId` как tie-breaker.
- [ ] Архивировать personal и orphan shared workspaces на шесть календарных месяцев.
- [ ] Не оставлять shared workspace с участниками без owner.
- [ ] Реализовать recovery request без account enumeration.
- [ ] Создавать hashed single-use recovery proof через security-mail outbox.
- [ ] Добавить TTL, cooldown и rate limit.
- [ ] Атомарно потреблять proof и блокировать гонку recovery/purge.
- [ ] Не восстанавливать прежние sessions.
- [ ] Запретить автоматическое объединение с новым аккаунтом на том же e-mail.
- [ ] Реализовать checkpointed dependency-ordered purge.
- [ ] Поддержать legal hold.
- [ ] Удалять PostgreSQL, search, S3 и exports согласованно.
- [ ] Сохранять shared audit через actor tombstone без удаляемой PII.
- [ ] Создать backup tombstone после успешного purge.
- [ ] Повторно применять tombstones после восстановления backup.
- [ ] Покрыть early purge denial, recovery race, replay и partial failure tests.

## 25. Production hardening

- [ ] Выбрать и зафиксировать PostgreSQL, S3 и e-mail providers.
- [ ] Заполнить обязательные TTL, quotas, retries и retention values.
- [ ] Настроить secret manager и процедуру key rotation.
- [ ] Настроить private bucket и запрет публичного доступа.
- [ ] Проверить e-mail domain authentication и suppression handling.
- [ ] Настроить security headers, CORS и cookie domain policy.
- [ ] Выполнить tenant-isolation и object-authorization review.
- [ ] Выполнить auth, TOTP, session, CSRF и rate-limit security review.
- [ ] Выполнить file upload abuse и decompression-bomb review.
- [ ] Проверить connection pool backpressure API/worker.
- [ ] Провести performance tests дерева, поиска, архива и экспорта.
- [ ] Зафиксировать SLO, alerting, RPO и RTO.
- [ ] Настроить backup PostgreSQL и object storage metadata.
- [ ] Провести restore rehearsal с tombstone replay до открытия трафика.
- [ ] Подготовить expand/migrate/contract и rollback runbooks.
- [ ] Проверить readiness при деградации обязательных и необязательных провайдеров.
- [ ] Не выполнять production deploy автоматически без отдельного подтверждения.

## 26. Общий Definition of Done группы

- [ ] Domain и application правила не зависят от transport/provider.
- [ ] Публичные права и инварианты проверяются сервером.
- [ ] Migration и Kysely contract синхронны.
- [ ] OpenAPI, error codes и frontend artifact актуальны.
- [ ] Audit/outbox входят в требуемую транзакцию.
- [ ] Повтор, concurrency, stale version и unknown outcome обработаны.
- [ ] Секреты и чувствительные payload не попадают в логи и ответы.
- [ ] Unit, integration, concurrency, authorization и релевантные e2e тесты пройдены.
- [ ] Наблюдаемость позволяет найти запрос и связанные jobs по correlation ID.
- [ ] Документация, версия и журнал изменений обновлены.
