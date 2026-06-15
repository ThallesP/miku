import { Migration } from '@mikro-orm/migrations';

export class Migration20260615052543 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table "application" ("id" varchar(255) not null, "name" varchar(255) not null, "x" real not null, "y" real not null, "created_at" timestamptz not null, constraint "application_pkey" primary key ("id"));`);

    this.addSql(`create table "server" ("id" varchar(255) not null, "name" varchar(255) not null, "address" varchar(255) not null, "network" varchar(255) not null, "joined_at" timestamptz not null, "last_seen_at" timestamptz not null, constraint "server_pkey" primary key ("id"));`);
    this.addSql(`alter table "server" add constraint "server_name_unique" unique ("name");`);
  }

}
