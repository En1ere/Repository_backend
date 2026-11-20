# Moving local development data between computers

The data flow is `local PostgreSQL -> database-data.json -> Git -> local PostgreSQL`.

On the computer containing the newest development data:

```bash
pnpm db:data:generate
```

The command reads the local database configured in `.env` and rewrites
`database-data.json`. It refuses to export while local migrations are pending.
Commit that file together with any new migrations.

On the other computer, pull the commit and run:

```bash
pnpm db:data:apply
```

The apply command checks for pending TypeORM migrations, applies them in one
migration transaction, validates `database-data.json`, and then replaces all
rows in the supported tables in a separate transaction. Data that exists only
on the target computer is deleted.

If the project has no migrations yet and the local schema is empty, apply uses
TypeORM schema synchronization once to bootstrap the current entities. As soon
as migrations exist, they remain the only automatic schema update mechanism.

Both commands refuse remote database hosts and `NODE_ENV=production`. They copy
all current tables: `User`, `AuthCredentials`, `Session`,
`PasswordRecoverySecret`, and `PasswordRecoverySession`.

`database-data.json` contains password, session, and recovery hashes. It is
intended only for the current development stage and development-only accounts.

The Docker Compose database is currently named `nest_rep`, while `.env.example`
uses `repository_backend_local`. Ensure `DB_NAME` matches the database you
actually created before running either command.
