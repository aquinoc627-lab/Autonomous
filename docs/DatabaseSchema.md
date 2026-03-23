# Autonomous Database Schema

## Overview

The Autonomous database schema is designed to support a robust, real-time orchestration platform. It is built using SQLAlchemy 2.0 with asynchronous support, allowing seamless switching between SQLite for local development and PostgreSQL for production environments. The schema strictly enforces data integrity, relationships, and security constraints at the database level.

![Entity Relationship Diagram](./erd.png)

## Core Entities

The schema revolves around three primary entities and their interactions, supported by robust authentication and auditing tables.

### Users (`users`)
The `users` table stores authentication and authorization data. It implements role-based access control (RBAC) via the `role` column (`admin` or `operator`). Passwords are never stored in plaintext; instead, bcrypt hashes are stored in the `hashed_password` column. The `is_active` flag allows for soft-disabling accounts without breaking foreign key constraints.

### Agents (`agents`)
The `agents` table represents autonomous entities within Autonomous. Each agent has a unique `name` and a `status` (`idle`, `active`, `offline`, `error`) that tracks its current operational state. Agents are linked to the user who created them via the `created_by` foreign key.

### Missions (`missions`)
The `missions` table defines tasks or objectives. Missions progress through a defined lifecycle (`pending`, `in_progress`, `completed`, `failed`, `cancelled`) and are assigned a `priority` level. They track execution time via `started_at` and `completed_at` timestamps.

## Relationships

### Agent Assignments (`agent_missions`)
Because a single mission can require multiple agents, and a single agent can participate in multiple missions simultaneously, the relationship between Agents and Missions is many-to-many. This is resolved via the `agent_missions` junction table. 

This table includes a unique composite constraint on `(agent_id, mission_id)` to prevent duplicate assignments. It also tracks audit information: when the assignment was made (`assigned_at`) and by whom (`assigned_by`). Cascading deletes ensure that if an agent or mission is removed, the corresponding assignment records are automatically cleaned up.

### Real-Time Communication (`banter`)
The `banter` table stores the real-time messaging feed. It is designed to be highly polymorphic. A banter message can be associated with:
- A specific mission (`mission_id`)
- A specific agent (`agent_id`)
- Both a mission and an agent
- Neither (acting as a global broadcast)

Messages are categorized by `message_type` (`chat`, `system`, `alert`, `status_update`) to allow the frontend to render them differently. The table is heavily indexed, particularly on `mission_id` and `created_at`, to optimize the common query pattern of fetching the latest messages for a specific mission.

## Security and Auditing

Security is a primary focus of the schema design, adhering to the requirement for a foolproof architecture.

### Token Management (`refresh_tokens`)
To support secure JWT authentication with token rotation, the `refresh_tokens` table stores the SHA-256 hashes of active refresh tokens. Storing only the hash ensures that even if the database is compromised, the tokens cannot be used by an attacker. The `revoked` flag allows administrators to immediately invalidate sessions without waiting for the token to expire.

### Audit Logging (`audit_log`)
The `audit_log` table provides an immutable, append-only record of all security-relevant actions and data mutations within the platform. It captures the user performing the action, the entity affected, and a JSON payload (`details`) containing the before-and-after state or supplementary context. This table is critical for forensic analysis and compliance.

## Implementation Details

The schema is implemented using SQLAlchemy's declarative mapping. All models inherit from a common `Base` class and utilize mixins for standardized columns:
- `UUIDPrimaryKey`: Ensures all primary entities use UUIDs for their primary keys, preventing enumeration attacks and facilitating distributed ID generation.
- `TimestampMixin`: Automatically manages `created_at` and `updated_at` timestamps for all records.

Data validation is enforced at the API boundary using Pydantic schemas (`app/schemas/schemas.py`), ensuring that only well-formed data reaches the database layer. Alembic is configured for asynchronous database migrations, allowing the schema to evolve safely over time.
